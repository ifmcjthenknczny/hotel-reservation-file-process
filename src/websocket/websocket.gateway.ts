import { Injectable } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from 'nestjs-pino';
import { TaskStatus } from '~/tasks/tasks.schema';

type TaskUpdate = { taskId: string; status: TaskStatus; message?: string };

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  allowEIO3: true,
  transports: ['websocket', 'polling'],
})
@Injectable()
export class WebsocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(private readonly logger: Logger) {}

  @WebSocketServer() io: Server;

  afterInit() {
    this.logger.log('Websocket successfully initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Websocket client id: ${client.id} connected`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Websocket client id: ${client.id} disconnected`);
  }

  sendTaskUpdate({ taskId, status, message }: TaskUpdate) {
    this.io.emit('tasks', { taskId, status, message, eventAt: new Date() });
  }
}
