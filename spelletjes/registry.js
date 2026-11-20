import {games as market} from './games-market.js';
import {games as harbor} from './games-harbor.js';
import {games as puzzles} from './games-puzzles.js';
import {games as play} from './games-play.js';
import {games as legacy} from './legacy.js';

const order = ['kringspel','broodbalans','vijgenvangst','bread','mint','lichte-munt','windvlieger','tweepoorten','schaduwspel','maskerspel','krukjacht','schaalstapelen','kruikenketting','waterweg','rope','vaargeul','netten','hondenvlag','knikkerbaan','luifelvlucht','touwtrek','lastdrager','reddingslijn','tegelpad'];
const all = [...market, ...harbor, ...puzzles, ...play, ...legacy];
export const games = order.map(id => all.find(game => game.id === id)).filter(Boolean);
export const gameById = id => games.find(game => game.id === id) || null;

