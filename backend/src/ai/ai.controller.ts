import { Controller, Post, Body } from '@nestjs/common';
import { AiService, AiAnalyzeRequest, AiAnalyzeResponse } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('analyze')
  async analyze(@Body() body: AiAnalyzeRequest): Promise<AiAnalyzeResponse> {
    return this.aiService.processPrompt(body);
  }

  @Post('docs')
  async docs(@Body() body: { filename: string; code: string }): Promise<{ docs: string }> {
    const docs = this.aiService.generateDocumentation(body.filename || 'index.ts', body.code || '');
    return { docs };
  }
}
