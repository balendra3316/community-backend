// src/types/express.d.ts
import { Request } from 'express';
import { IUser } from '../models/User.model';
import { IAdmin } from '../../models/Admin.model';

export interface CustomRequest extends Request {
  user?: IUser;
  admin?: IAdmin
}
