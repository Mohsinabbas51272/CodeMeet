import { 
  WebSocketGateway, 
  SubscribeMessage, 
  MessageBody, 
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as pty from 'node-pty';
import * as os from 'os';
import { spawn } from 'child_process';
import { AiService } from '../../ai/ai.service';

interface TerminalAdapter {
  write: (data: string) => void;
  resize?: (cols: number, rows: number) => void;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MeetingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private terminals = new Map<string, TerminalAdapter>();

  constructor(private readonly aiService: AiService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @MessageBody() data: { roomId: string, username: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.roomId);
    console.log(`${client.id} (${data.username}) joined room ${data.roomId}`);
    
    client.to(data.roomId).emit('user-joined', {
      userId: client.id,
      username: data.username,
    });
    
    if (!this.terminals.has(data.roomId)) {
      this.initTerminalForRoom(data.roomId);
    }
    
    return { status: 'joined', roomId: data.roomId };
  }

  private initTerminalForRoom(roomId: string) {
    // 1. Attempt node-pty first
    try {
      const shell = process.env.SHELL || (os.platform() === 'win32' ? 'powershell.exe' : '/bin/zsh');
      const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd: process.cwd(),
        env: process.env as any,
      });

      ptyProcess.onData((output) => {
        this.server.to(roomId).emit('terminal-output', output);
      });

      this.terminals.set(roomId, {
        write: (input: string) => ptyProcess.write(input),
        resize: (cols: number, rows: number) => ptyProcess.resize(cols, rows),
      });

      console.log(`Initialized node-pty terminal for room ${roomId}`);
      return;
    } catch (err) {
      console.warn('node-pty spawn failed, falling back to standard child_process.spawn:', err?.message || err);
    }

    // 2. Fallback to Node built-in child_process
    try {
      const fallbackShell = os.platform() === 'win32' ? 'cmd.exe' : '/bin/sh';
      const cp = spawn(fallbackShell, os.platform() === 'win32' ? [] : ['-i'], {
        cwd: process.cwd(),
        env: process.env,
      });

      cp.stdout.on('data', (chunk) => {
        this.server.to(roomId).emit('terminal-output', chunk.toString());
      });

      cp.stderr.on('data', (chunk) => {
        this.server.to(roomId).emit('terminal-output', chunk.toString());
      });

      cp.on('error', (cpErr) => {
        console.error('child_process terminal error:', cpErr);
      });

      this.terminals.set(roomId, {
        write: (input: string) => {
          if (cp.stdin && !cp.stdin.destroyed) {
            cp.stdin.write(input);
          }
        },
      });

      console.log(`Initialized child_process terminal fallback for room ${roomId}`);
    } catch (finalErr) {
      console.error('Failed to initialize terminal session:', finalErr);
    }
  }

  @SubscribeMessage('chat-message')
  handleChatMessage(
    @MessageBody() data: { roomId: string, message: string, username: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(data.roomId).emit('chat-message', {
      userId: client.id,
      username: data.username,
      message: data.message,
      timestamp: new Date().toISOString()
    });
  }

  @SubscribeMessage('code-change')
  handleCodeChange(
    @MessageBody() data: { roomId: string, code: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(data.roomId).emit('code-change', {
      userId: client.id,
      code: data.code,
    });
  }

  @SubscribeMessage('terminal-input')
  handleTerminalInput(
    @MessageBody() data: { roomId: string, input: string },
    @ConnectedSocket() client: Socket,
  ) {
    const term = this.terminals.get(data.roomId);
    if (term) {
      try {
        term.write(data.input);
      } catch (e) {
        console.error('Error writing to terminal:', e);
      }
    }
  }

  @SubscribeMessage('terminal-resize')
  handleTerminalResize(
    @MessageBody() data: { roomId: string, cols: number, rows: number },
    @ConnectedSocket() client: Socket,
  ) {
    const term = this.terminals.get(data.roomId);
    if (term && term.resize) {
      try {
        term.resize(data.cols, data.rows);
      } catch (e) {
        console.error('Error resizing terminal:', e);
      }
    }
  }

  @SubscribeMessage('ai-prompt')
  async handleAiPrompt(
    @MessageBody() data: { roomId: string; prompt: string; code: string; filename?: string; agentRole?: any },
    @ConnectedSocket() client: Socket,
  ) {
    this.server.to(data.roomId).emit('ai-thinking', {
      status: 'analyzing',
      message: 'AI Specialist is inspecting context...'
    });

    const response = await this.aiService.processPrompt({
      prompt: data.prompt,
      code: data.code,
      filename: data.filename || 'index.ts',
      agentRole: data.agentRole || 'senior',
    });

    this.server.to(data.roomId).emit('chat-message', {
      userId: 'ai-agent',
      username: `AI (${data.agentRole?.toUpperCase() || 'SENIOR'})`,
      message: response.explanation,
      timestamp: new Date().toISOString(),
    });

    if (response.architectureDiagram) {
      this.server.to(data.roomId).emit('architecture-update', {
        diagram: response.architectureDiagram,
      });
    }

    if (response.suggestedCode) {
      this.server.to(data.roomId).emit('ai-cursor-move', {
        line: 3,
        column: 1,
        label: 'AI Editing...',
      });

      setTimeout(() => {
        this.server.to(data.roomId).emit('code-change', {
          userId: 'ai-agent',
          code: response.suggestedCode,
        });

        this.server.to(data.roomId).emit('ai-cursor-clear', {});
      }, 1200);
    }
  }
}
