


// src/types/express.d.ts
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


// // src/types/express.d.ts
import { Request } from 'express';
// import { IUser } from '../models/User.model';
// import { IAdmin } from '../../models/Admin.model';


export interface CustomRequest extends Request {
  user?: IUser;
  admin?: IAdmin
}
