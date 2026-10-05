/** Wire contract. Runtime validates authority, sequence, tick and ownership. */
export type Action = 'left' | 'right' | 'up' | 'down' | 'lp' | 'mp' | 'hp' | 'lk' | 'mk' | 'hk';
export type Player = 0 | 1;
export type Join = {type:'join';room:string;role:'display';clientAt?:number} | {type:'join';room:string;role:'player';token:string;clientAt?:number};
export type Input = {seq:number;round:number;eventTime?:number;layoutEpoch?:number;controlEpoch?:number} & ({type:'touch';pose?:{x:number;y:number;vx:number;vy:number};view?:{x:number;y:number};at?:number;pointer:number;tick:number;id:string;epoch:number;x:number;y:number} | {type:'move';at?:number;pointer:number;tick:number;id:string;epoch:number;x:number;y:number} | {type:'release';at?:number;pointer:number;fling?:boolean} | {type:'viewport';width:number;height:number} | {type:'rematch'});
export interface Puck {id:string;origin:Player;owner:Player;grabbed?:boolean;epoch:number;action:Action;x:number;y:number;vx:number;vy:number;entry?:{epoch:number;tick:number;x:number;caught?:boolean}}

/** accepted is puck contact/input validity; actionAccepted is separate combat legality. */
export interface InputAck {type:'ack';inputType:'touch'|'release';seq:number;pointer:number;id?:string;epoch?:number;round:number;controlEpoch:number;layoutEpoch:number;accepted:boolean;grab:boolean;actionAccepted:boolean;practice:boolean;tick:number;inputTick?:number;puck?:Puck;eventTime?:number;effectiveTime?:number;lateMs?:number;receivedAt?:number;processingMs?:number;attackAge?:number}

export type ClockRequest={type:"clock";clientAt:number};
export type ClockReply={type:"clock";clientAt:number;serverAt:number}|{type:"clock-reset"};

export type MotionInput = {seq:number;round:number;controlEpoch:number;layoutEpoch:number} & ({type:"motion";pucks:Pick<Puck,"id"|"epoch"|"x"|"y"|"vx"|"vy">[]} | {type:"transfer";puck:Pick<Puck,"id"|"epoch"|"x"|"y"|"vx"|"vy">} | {type:"activity";active:boolean});
