/** Wire contract. Runtime validates authority, sequence, tick and ownership. */
export type Action = 'left' | 'right' | 'up' | 'down' | 'lp' | 'mp' | 'hp' | 'lk' | 'mk' | 'hk';
export type Player = 0 | 1;
export type Join = {type:'join';room:string;role:'display'} | {type:'join';room:string;role:'player';token:string};
export type Input = {seq:number;round:number;layoutEpoch?:number;controlEpoch?:number} & ({type:'touch';at?:number;pointer:number;tick:number;id:string;epoch:number;x:number;y:number} | {type:'move';at?:number;pointer:number;tick:number;id:string;epoch:number;x:number;y:number} | {type:'release';at?:number;pointer:number;fling?:boolean} | {type:'viewport';width:number;height:number} | {type:'rematch'});
export interface Puck {id:string;origin:Player;owner:Player;grabbed?:boolean;epoch:number;action:Action;x:number;y:number;vx:number;vy:number}

/** accepted is puck contact/input validity; actionAccepted is separate combat legality. */
export interface InputAck {type:'ack';inputType:'touch'|'release';seq:number;pointer:number;id?:string;epoch?:number;round:number;controlEpoch:number;layoutEpoch:number;accepted:boolean;grab:boolean;actionAccepted:boolean;practice:boolean;tick:number;inputTick?:number;puck?:Puck}
