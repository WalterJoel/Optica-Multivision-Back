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

  @Column({ type: 'text', nullable: true })
  mensaje?: string;

  @ManyToOne(() => User, { nullable: false })
  user: User;

  @Column({ nullable: true })
  fileUrl?: string;

  @Column({ nullable: true })
  fileName?: string;

  @Column({ nullable: true })
  fileType?: string;

  @Column({ type: 'int', nullable: true })
  fileSize?: number;

  @CreateDateColumn()
  createdAt: Date;
}
