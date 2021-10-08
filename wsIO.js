const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const ser = http.Server(app);


class WsIO {
    constructor() {
        this.rooms = new Map();
        this.users = new Map();
    }
    run() {
        let soc = socketIo(ser);
        soc.on('connection',(socket)=>{
            //监听connection（用户连接）事件，socket为用户连接的实例
            socket.on('disconnect',()=>{
                //监听用户断开事件
                const user = this.users.get(socket.id);
                if (user){
                    this.users.delete(user.id);
                    const room = user.roomId ? this.rooms.get(user.roomId) : null;
                    const item = [];
                    if (room){
                        for(const v of room){
                            if (v !== user.id){
                                item.push(v);
                            }
                        }
                        this.rooms.set(user.roomId, item);
                    }
                }
                console.log("用户"+socket.id+"断开连接");
            });
            console.log("用户"+socket.id+"连接");
            this.users.set(socket.id, socket);
            socket.on('leave', (data) => {
                this.leaveHandler(JSON.parse(data), socket.id);
            });
            socket.on('data',  (data) => {
                // console.log(data)
                this.messageHandler(data, socket.id);
            });
            socket.on('join',  ({ roomId }) => {
                this.joinHandler(roomId, socket.id);
            });
        });
        ser.listen(8090);
    }
    tellEveryOneIMJoin(roomId, id){
        let room = this.rooms.get(roomId);
        room = room ? room : [];
        for (const v of room){
            if (v !== id){
                let user = this.users.get(v);
                user.emit('ready', roomId, id);
                user = this.users.get(id);
                user.emit('ready', roomId, v);
            }
        }
    }
    joinHandler(roomId, id) {
        // console.log(roomid);
        let user = this.users.get(id);
        let room = this.rooms.get(roomId);
        room = room ? room : [];
        room.push(id);
        user.roomId = roomId;
        this.users.set(id, user);
        this.rooms.set(roomId, room);
        user.emit('ready', { sid: id });
        this.tellEveryOneIMJoin(roomId, id);
    }
    messageHandler(data, id) {
        let user = this.users.get(id);//信息交换 文件检索 发送文件
        let room = this.rooms.get(user.roomId);
        if (!room){
            return user.disconnect();
        }
        let isConnect = false;
        for (const v of room){
            if (v === id){
                isConnect = true;
            }
        }
        if (!isConnect){
            user.disconnect();
        }
        this.sendMessage(data ,id);
        // switch (data.type) {
        //     case 'offer':
        //         if (data.sdp){
        //             user.sdp = data.sdp;
        //             this.users.set(id, user);
        //         }
        //         break;
        //     case 'candidate':
        //         this.sendMessage(data ,id);
        //         break;
        //     default:
        //         console.log(data)
        //         break;
        // }
    }
    sendMessage(data, id) {
        const user = this.users.get(id);
        if (!user){
            return user.disconnect();
        }
        let room = this.rooms.get(user.roomId);
        room = room ? room : [];
        for (const v of room){
            if (v !== id){
                let user = this.users.get(v);
                user.emit('data', data);
            }
        }
    }
    leaveHandler(data, id) {
        let user = this.users.get(id);
        const room = user.roomId ? this.rooms.get(user.roomId) : null;
        const item = [];
        if (room){
            for(const v of room){
                if (v !== user.id){
                    item.push(v);
                }
            }
            this.rooms.set(user.roomId, item);
        }
        user.roomId = undefined;
        this.users.set(id, user);
        user.emit('leaved', user.roomId, id);
    }
}
let instWsIO = new WsIO();
module.exports = instWsIO;




