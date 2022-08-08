/// <reference types="node" />
import { Socket } from 'dgram';
import { ViscaCommand } from './Command';
export declare class ViscaCamera {
    client: Socket;
    connected: boolean;
    ip: string;
    port: number;
    events: {
        [key in ViscaCameraEventTypes]?: (...args: any[]) => void;
    };
    inquiryReady: boolean;
    commandReady: boolean;
    inquiryCallback: {
        [index: string]: ViscaCommand;
    };
    inquiryQueue: ViscaCommand[];
    sentCommands: ViscaCommand[];
    commandQueue: ViscaCommand[];
    updateTimeout: NodeJS.Timeout;
    constructor(ip: string, port: number);
    on(eventType: ViscaCameraEventTypes, handler: (...args: any[]) => void): void;
    _handle(eventType: ViscaCameraEventTypes, ...data: any[]): void;
    reconnect(): void;
    private sendDirect;
    sendCommand(command: ViscaCommand): void;
    onData(viscaCommand: ViscaCommand): void;
    ack(viscaCommand: ViscaCommand): void;
    complete(viscaCommand: ViscaCommand): void;
    error(viscaCommand: ViscaCommand): void;
    _clear(): void;
    _updateBooleans(): void;
    _scheduleUpdate(): void;
    _update(): void;
    _processQueue(): void;
    _expireOldCommands(): void;
}
declare type ViscaCameraEventTypes = 'connected' | 'closed' | 'error';
export {};
