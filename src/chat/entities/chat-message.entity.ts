import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  mensaje: string;

  @ManyToOne(() => User, { nullable: false })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
