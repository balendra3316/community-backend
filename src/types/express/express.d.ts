



import { Socket } from 'socket.io';
import { Server as IOServer } from 'socket.io';
import { IUser } from '../models/User.model';
import { IAdmin } from '../../models/Admin.model';

declare module 'express-serve-static-core' {
  interface Request {
    user?: IUser;
    admin?: IAdmin;
    io?: IOServer;
  }
}



import { Request } from 'express';




export interface CustomRequest extends Request {
  user?: IUser;
  admin?: IAdmin
}
