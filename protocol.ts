/** Wire contract. Runtime validates authority, sequence, tick and ownership. */
export type Action = 'left' | 'right' | 'up' | 'down' | 'jab' | 'shove';
export type Player = 0 | 1;
export type Join = {type:'join';room:string;role:'display'} | {type:'join';room:string;role:'player';token:string};
export type Input = {seq:number;round:number} & ({type:'touch';pointer:number;tick:number;id:string;epoch:number;x:number;y:number} | {type:'release';pointer:number} | {type:'rematch'});
export interface Puck {id:string;owner:Player;epoch:number;action:Action;x:number;y:number;vx:number;vy:number}
