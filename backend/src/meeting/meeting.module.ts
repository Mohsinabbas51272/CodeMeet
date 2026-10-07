import { Module } from '@nestjs/common';
import { MeetingGateway } from './meeting/meeting.gateway';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  providers: [MeetingGateway],
})
export class MeetingModule {}
