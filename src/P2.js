// ====================================================================================
//                                  HOW TO RUN THIS
// ====================================================================================
// Call:
// "node Client.js -h [host] -p [port] -k [key] -l [logFilename]"
//
// If no argument given, it'll be 127.0.0.1:3011
// key is a secret string that authenticate the bot identity
// it is not required when testing
// ====================================================================================



// ====================================================================================
//       THE CONSTANT. YOU'RE GONNA NEED THIS. MARK THIS FOR LATER REFERENCE
// ====================================================================================
var STATE_WAITING_FOR_PLAYERS = 0;
var STATE_TANK_PLACEMENT = 1;
var STATE_ACTION = 2;
var STATE_SUDDEN_DEATH = 3;
var STATE_FINISHED = 4;

var TEAM_1 = 1;
var TEAM_2 = 2;

var MAP_W = 22;
var MAP_H = 22;

var BLOCK_GROUND = 0;
var BLOCK_WATER = 1;
var BLOCK_HARD_OBSTACLE = 2;
var BLOCK_SOFT_OBSTACLE = 3;
var BLOCK_BASE = 4;

// dang.kien.thanh
var MVN_ENEMY_TANK = 5;
var MVN_MY_OTHER_TANK = 6;
var MVN_CURRENT_TANK = 7;


var TANK_LIGHT = 1;
var TANK_MEDIUM = 2;
var TANK_HEAVY = 3;

var DIRECTION_UP = 1;
var DIRECTION_RIGHT = 2;
var DIRECTION_DOWN = 3;
var DIRECTION_LEFT = 4;

var NUMBER_OF_TANK = 4;

var BASE_MAIN = 1;
var BASE_SIDE = 2;


var MATCH_RESULT_NOT_FINISH = 0;
var MATCH_RESULT_TEAM_1_WIN = 1;
var MATCH_RESULT_TEAM_2_WIN = 2;
var MATCH_RESULT_DRAW = 3;
var MATCH_RESULT_BAD_DRAW = 4;

var POWERUP_AIRSTRIKE = 1;
var POWERUP_EMP = 2;

//object sizes
var TANK_SIZE = 1;
var BASE_SIZE = 2;

// ====================================================================================
//                        BEHIND THE SCENE. YOU CAN SAFELY SKIP THIS
//                  Note: Don't try to modify this. It can ruin your life.
// ====================================================================================

// =============================================
// Get the host and port from argurment
// =============================================

// Logger
var Logger;
try {
	Logger = require("./NodeWS/Logger");
}
catch (e) {
	Logger = require("./../NodeWS/Logger");
}
var logger = new Logger();

var host = "127.0.0.1";
var port = 3011;
var key = 0;

for (var i=0; i<process.argv.length; i++) {
	if (process.argv[i] == "-h") {
		host = process.argv[i + 1];
	}
	else if (process.argv[i] == "-p") {
		port = process.argv[i + 1];
	}
	else if (process.argv[i] == "-k") {
		key = process.argv[i + 1];
	}
	else if (process.argv[i] == "-l") {
		logger.startLogfile(process.argv[i + 1]);
	}
}
if (host == null) host = "127.0.0.1";
if (port == null) port = 3011;
if (key == null) key = 0;

// =============================================
// Some helping function
// =============================================
var EncodeInt8 = function (number) {
	var arr = new Int8Array(1);
	arr[0] = number;
	return String.fromCharCode(arr[0]);
};
var EncodeInt16 = function (number) {
	var arr = new Int16Array(1);
	var char = new Int8Array(arr.buffer);
	arr[0] = number;
	return String.fromCharCode(char[0], char[1]);
};
var EncodeUInt8 = function (number) {
	var arr = new Uint8Array(1);
	arr[0] = number;
	return String.fromCharCode(arr[0]);
};
var EncodeUInt16 = function (number) {
	var arr = new Uint16Array(1);
	var char = new Uint8Array(arr.buffer);
	arr[0] = number;
	return String.fromCharCode(char[0], char[1]);
};
var EncodeFloat32 = function (number) {
	var arr  = new Float32Array(1);
	var char = new Uint8Array(arr.buffer);
	
	arr[0] = number;
	return String.fromCharCode(char[0], char[1], char[2], char[3]);
};
var DecodeInt8 = function (string, offset) {
	var arr  = new Int8Array(1);
	var char = new Int8Array(arr.buffer);
	arr[0] = string.charCodeAt(offset);
	return char[0];
};
var DecodeInt16 = function (string, offset) {
	var arr  = new Int16Array(1);
	var char = new Int8Array(arr.buffer);
	
	for (var i=0; i<2; ++i) {
		char[i] = string.charCodeAt(offset + i);
	}
	return arr[0];
};
var DecodeUInt8 = function (string, offset) {
	return string.charCodeAt(offset);
};
var DecodeUInt16 = function (string, offset) {
	var arr  = new Uint16Array(1);
	var char = new Uint8Array(arr.buffer);
	
	for (var i=0; i<2; ++i) {
		char[i] = string.charCodeAt(offset + i);
	}
	return arr[0];
};
var DecodeFloat32 = function (string, offset) {
	var arr  = new Float32Array(1);
	var char = new Uint8Array(arr.buffer);
	
	for (var i=0; i<4; ++i) {
		char[i] = string.charCodeAt(offset + i);
	}
	return arr[0];
};

// =============================================
// Game objects
// =============================================
function Obstacle() {
	this.m_id = 0;
	this.m_x = 0;
	this.m_y = 0;
	this.m_HP = 0;
	this.m_destructible = true;
}
function Base () {
	this.m_id = 0;
	this.m_team = 0;
	this.m_type = 0;
	this.m_HP = 0;
	this.m_x = 0;
	this.m_y = 0;
}
function Tank() {
	this.m_id = 0;
	this.m_x = 0;
	this.m_y = 0;
	this.m_team = TEAM_1;
	this.m_type = TANK_LIGHT;
	this.m_HP = 0;
	this.m_direction = DIRECTION_UP;
	this.m_speed = 0;
	this.m_rateOfFire = 0;
	this.m_coolDown = 0;
	this.m_damage = 0;
	this.m_disabled = 0;
}
function Bullet() {
	this.m_id = 0;
	this.m_x = 0;
	this.m_y = 0;
	this.m_team = TEAM_1;
	this.m_type = TANK_MEDIUM;
	this.m_direction = DIRECTION_UP;
	this.m_speed = 0;
	this.m_damage = 0;
	this.m_live = false;
}
function Strike() {
	this.m_id = 0;
	this.m_x = 0;
	this.m_y = 0;
	this.m_team = TEAM_1;
	this.m_type = POWERUP_AIRSTRIKE;
	this.m_countDown = 0;
	this.m_live = false;
}
function PowerUp() {
	this.m_id = 0;
	this.m_active = 0;
	this.m_type = 0;
	this.m_x = 0;
	this.m_y = 0;
}
var g_team = -1;
var g_state = STATE_WAITING_FOR_PLAYERS;
var g_map = new Array();
var g_obstacles = new Array();
var g_hardObstacles = new Array();
var g_tanks = new Array();
	g_tanks[TEAM_1] = new Array();
	g_tanks[TEAM_2] = new Array();
var g_bullets = new Array();
	g_bullets[TEAM_1] = new Array();
	g_bullets[TEAM_2] = new Array();
var g_bases = new Array();
	g_bases[TEAM_1] = new Array();
	g_bases[TEAM_2] = new Array();
var g_powerUps = new Array();
var g_strikes = new Array();
	g_strikes[TEAM_1] = new Array();
	g_strikes[TEAM_2] = new Array();
	
var g_matchResult;
var g_inventory = new Array();
	g_inventory[TEAM_1] = new Array();
	g_inventory[TEAM_2] = new Array();

var g_timeLeft = 0;

// =============================================
// Protocol - Sending and updating
// =============================================
var WebSocket;
try {
	WebSocket = require("./NodeWS");
}
catch (e) {
	WebSocket = require("./../NodeWS");
}

var SOCKET_IDLE = 0;
var SOCKET_CONNECTING = 1;
var SOCKET_CONNECTED = 2;

var COMMAND_PING = 0;
var COMMAND_SEND_KEY = 1;
var COMMAND_SEND_TEAM = 2;
var COMMAND_UPDATE_STATE = 3;
var COMMAND_UPDATE_MAP = 4;
var COMMAND_UPDATE_TANK = 5;
var COMMAND_UPDATE_BULLET = 6;
var COMMAND_UPDATE_OBSTACLE = 7;
var COMMAND_UPDATE_BASE = 8;
var COMMAND_REQUEST_CONTROL = 9;
var COMMAND_CONTROL_PLACE = 10;
var COMMAND_CONTROL_UPDATE = 11;
var COMMAND_UPDATE_POWERUP = 12;
var COMMAND_MATCH_RESULT = 13;
var COMMAND_UPDATE_INVENTORY = 14;
var COMMAND_UPDATE_TIME = 15;
var COMMAND_CONTROL_USE_POWERUP = 16;
var COMMAND_UPDATE_STRIKE = 17;


var socket = null;
var socketStatus = SOCKET_IDLE;


socket = WebSocket.connect ("ws://" + host + ":" + port, [], function () {
	logger.print ("Socket connected");
	socketStatus = SOCKET_CONNECTED;
	SendKey();
});
socket.on("error", function (code, reason) {
	socketStatus = SOCKET_IDLE;
	logger.print ("Socket error: " + code);
});
socket.on("text", function (data) {
	OnMessage (data);
});
socketStatus = SOCKET_CONNECTING;


function Send(data) {
	//console.log ("Socket send: " + PacketToString(data));
	socket.sendText (data);
}
function OnMessage(data) {
	// console.log ("Data received: " + PacketToString(data));
	
	var readOffset = 0;
	
	while (true) {
		var command = DecodeUInt8 (data, readOffset); 
		readOffset++;
		
		if (command == COMMAND_SEND_TEAM) {
			g_team = DecodeUInt8 (data, readOffset); readOffset ++;
		}
		else if (command == COMMAND_UPDATE_STATE) {
			state = DecodeUInt8 (data, readOffset);
			readOffset++;
			
			if (g_state == STATE_WAITING_FOR_PLAYERS && state == STATE_TANK_PLACEMENT) {
				g_state = state;
				setTimeout(OnPlaceTankRequest, 100);
			}
		}
		else if (command == COMMAND_UPDATE_MAP) {
			g_hardObstacles = new Array();
			for (var i=0; i<MAP_W; i++) {
				for (var j=0; j<MAP_H; j++) {
					g_map[j * MAP_W + i] = DecodeUInt8 (data, readOffset);
					readOffset += 1;
					
					if (g_map[j * MAP_W + i] == BLOCK_HARD_OBSTACLE) {
						var temp = new Obstacle();
						temp.m_id = -1;
						temp.m_x = i;
						temp.m_y = j;
						temp.m_HP = 9999;
						temp.m_destructible = false;
						g_hardObstacles.push (temp);
					}
				}
			}
		}
		else if (command == COMMAND_UPDATE_TIME) {
			g_timeLeft = DecodeInt16 (data, readOffset); readOffset += 2;
		}
		else if (command == COMMAND_UPDATE_OBSTACLE) {
			readOffset += ProcessUpdateObstacleCommand(data, readOffset);
		}
		else if (command == COMMAND_UPDATE_TANK) {
			readOffset += ProcessUpdateTankCommand(data, readOffset);
		}
		else if (command == COMMAND_UPDATE_BULLET) {
			readOffset += ProcessUpdateBulletCommand(data, readOffset);
		}
		else if (command == COMMAND_UPDATE_BASE) {
			readOffset += ProcessUpdateBaseCommand(data, readOffset);
		}
		else if (command == COMMAND_MATCH_RESULT) {
			readOffset += ProcessMatchResultCommand(data, readOffset);
		}
		else if (command == COMMAND_UPDATE_POWERUP) {
			readOffset += ProcessUpdatePowerUpCommand(data, readOffset);
		}
		else if (command == COMMAND_UPDATE_STRIKE) {
			readOffset += ProcessUpdateStrikeCommand(data, readOffset);
		}
		else if (command == COMMAND_UPDATE_INVENTORY) {
			readOffset += ProcessUpdateInventoryCommand(data, readOffset);
		}
		else if (command == COMMAND_REQUEST_CONTROL) {
			Update();
		}		
		else {
			readOffset ++;
			logger.print ("Invalid command id: " + command)
		}
		
		if (readOffset >= data.length) {
			break;
		}
	}
}
function SendKey() {
	if (socketStatus == SOCKET_CONNECTED) {
		var packet = "";
		packet += EncodeUInt8(COMMAND_SEND_KEY);
		packet += EncodeInt8(key);
		Send (packet);
	}
}



function ProcessUpdateObstacleCommand (data, originalOffset) {
	var offset = originalOffset;
	var id = DecodeUInt8 (data, offset); offset++;
	var x = DecodeUInt8 (data, offset); offset++;
	var y = DecodeUInt8 (data, offset); offset++;
	var HP = DecodeUInt8 (data, offset); offset++;
	
	if (g_obstacles[id] == null) {
		g_obstacles[id] = new Obstacle();
	}
	g_obstacles[id].m_id = id;
	g_obstacles[id].m_x = x;
	g_obstacles[id].m_y = y;
	g_obstacles[id].m_HP = HP;
	
	return offset - originalOffset;
}

function ProcessUpdateTankCommand (data, originalOffset) {
	var offset = originalOffset;
	var id = DecodeUInt8 (data, offset); offset++;
	var team = DecodeUInt8 (data, offset); offset++;
	var type = DecodeUInt8 (data, offset); offset++;
	var HP = DecodeUInt16 (data, offset); offset+=2;
	var dir = DecodeUInt8 (data, offset); offset++;
	var speed = DecodeFloat32 (data, offset); offset+=4;
	var ROF = DecodeUInt8 (data, offset); offset++;
	var cooldown = DecodeUInt8 (data, offset); offset++;
	var damage = DecodeUInt8 (data, offset); offset++;
	var disabled = DecodeUInt8 (data, offset); offset++;
	var x = DecodeFloat32 (data, offset); offset+=4;
	var y = DecodeFloat32 (data, offset); offset+=4;
	
	if (g_tanks[team][id] == null) {
		g_tanks[team][id] = new Tank();
	}
	g_tanks[team][id].m_id = id;
	g_tanks[team][id].m_team = team;
	g_tanks[team][id].m_type = type;
	g_tanks[team][id].m_HP = HP;
	g_tanks[team][id].m_direction = dir;
	g_tanks[team][id].m_speed = speed;
	g_tanks[team][id].m_rateOfFire = ROF;
	g_tanks[team][id].m_coolDown = cooldown;
	g_tanks[team][id].m_damage = damage;
	g_tanks[team][id].m_disabled = disabled;
	g_tanks[team][id].m_x = x;
	g_tanks[team][id].m_y = y;
	
	return offset - originalOffset;
}
function ProcessUpdateBulletCommand (data, originalOffset) {
	var offset = originalOffset;
	var id = DecodeUInt8 (data, offset); offset++;
	var live = DecodeUInt8 (data, offset); offset++;
	var team = DecodeUInt8 (data, offset); offset++;
	var type = DecodeUInt8 (data, offset); offset++;
	var dir = DecodeUInt8 (data, offset); offset++;
	var speed = DecodeFloat32 (data, offset); offset+=4;
	var damage = DecodeUInt8 (data, offset); offset++;
	var hit = DecodeUInt8 (data, offset); offset++; // not used 
	var x = DecodeFloat32 (data, offset); offset+=4;
	var y = DecodeFloat32 (data, offset); offset+=4;
	
	if (g_bullets[team][id] == null) {
		g_bullets[team][id] = new Bullet();
	}
	g_bullets[team][id].m_id = id;
	g_bullets[team][id].m_live = live;
	g_bullets[team][id].m_team = team;
	g_bullets[team][id].m_type = type;
	g_bullets[team][id].m_direction = dir;
	g_bullets[team][id].m_speed = speed;
	g_bullets[team][id].m_damage = damage;
	g_bullets[team][id].m_x = x;
	g_bullets[team][id].m_y = y;
	
	return offset - originalOffset;
}

function ProcessUpdatePowerUpCommand (data, originalOffset) {
	var offset = originalOffset;
	var id = DecodeUInt8 (data, offset); offset++;
	var active = DecodeUInt8 (data, offset); offset++;
	var type = DecodeUInt8 (data, offset); offset++;
	var x = DecodeFloat32 (data, offset); offset+=4;
	var y = DecodeFloat32 (data, offset); offset+=4;
	
	if (g_powerUps[id] == null) {
		g_powerUps[id] = new PowerUp();
	}
	g_powerUps[id].m_id = id;
	g_powerUps[id].m_active = active;
	g_powerUps[id].m_type = type;
	g_powerUps[id].m_x = x;
	g_powerUps[id].m_y = y;
	
	return offset - originalOffset;	
}

function ProcessUpdateBaseCommand (data, originalOffset) {
	var offset = originalOffset;
	var id = DecodeUInt8 (data, offset); offset++;
	var team = DecodeUInt8 (data, offset); offset++;
	var type = DecodeUInt8 (data, offset); offset++;
	var HP = DecodeUInt16 (data, offset); offset+=2;
	var x = DecodeFloat32 (data, offset); offset+=4;
	var y = DecodeFloat32 (data, offset); offset+=4;
	
	if (g_bases[team][id] == null) {
		g_bases[team][id] = new Base();
	}
	g_bases[team][id].m_id = id;
	g_bases[team][id].m_team = team;
	g_bases[team][id].m_type = type;
	g_bases[team][id].m_HP = HP;
	g_bases[team][id].m_x = x;
	g_bases[team][id].m_y = y;
	
	return offset - originalOffset;
}

function ProcessUpdateInventoryCommand (data, originalOffset) {
	g_inventory[TEAM_1] = new Array();
	g_inventory[TEAM_2] = new Array();

	var offset = originalOffset;
	var number1 = DecodeUInt8 (data, offset); offset++;
	for (var i=0; i<number1; i++) {
		g_inventory[TEAM_1][i] = DecodeUInt8 (data, offset); offset++;
	}
	var number2 = DecodeUInt8 (data, offset); offset++;
	for (var i=0; i<number2; i++) {
		g_inventory[TEAM_2][i] = DecodeUInt8 (data, offset); offset++;
	}
	
	return offset - originalOffset;
}

function ProcessUpdateStrikeCommand(data, originalOffset) {
	var offset = originalOffset;
	var id = DecodeUInt8 (data, offset); 		offset++;
	var team = DecodeUInt8 (data, offset); 		offset++;
	var type = DecodeUInt8 (data, offset); 		offset++;
	var live = DecodeUInt8 (data, offset); 		offset++;
	var countDown = DecodeUInt8 (data, offset);	offset++;
	var x = DecodeFloat32 (data, offset); 		offset+=4;
	var y = DecodeFloat32 (data, offset); 		offset+=4;
	
	if (g_strikes[team][id] == null) {
		g_strikes[team][id] = new Strike();
	}
	g_strikes[team][id].m_id = id;
	g_strikes[team][id].m_live = live;
	g_strikes[team][id].m_team = team;
	g_strikes[team][id].m_type = type;
	g_strikes[team][id].m_countDown = countDown;
	g_strikes[team][id].m_x = x;
	g_strikes[team][id].m_y = y;
	
	return offset - originalOffset;
}

function ProcessMatchResultCommand(data, originalOffset) {
	var offset = originalOffset;
	g_matchResult = DecodeUInt8 (data, offset); offset++;
	g_state = STATE_FINISHED; //update state for safety, server should also send a msg update state
	
	return offset - originalOffset;
}

// An object to hold the command, waiting for process
function ClientCommand() {
	var g_direction = 0;
	var g_move = false;
	var g_shoot = false;
	var g_dirty = false;
}
var clientCommands = new Array();
for (var i=0; i<NUMBER_OF_TANK; i++) {
	clientCommands.push (new ClientCommand());
}

// Pending command as a string.
var g_commandToBeSent = "";

//////////////////////////////////////////////////////////////////////////////////////
//                                                                                  //
//                                    GAME RULES                                    //
//                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////
// - The game is played on a map of 20x20 blocks where [x,y] is referred as the     //
// block at column x and row y.                                                     //
// - Each team has 1 main base, 2 side bases and 4 tanks.                           //
// - At the beginning of a game, each player will choose 4 tanks and place them     //
// on the map (not on any bases/obstacles/tanks).                                   //
// - The game is played in real-time mode. Each player will control 4 tanks in      //
// order to defend their bases and at the same time, try to destroy their enemy’s   //
// bases.                                                                           //
// -Your tank bullets or cannon shells will pass other allied tank (not friendly    //
// fire), but will damage your own bases, so watch where you firing.                //
// -A destroyed tank will allow bullet to pass through it, but still not allow      //
// other tanks to pass through.                                                     //
// - When the game starts (and after each 30 seconds) , a random power-up will be   //
// spawn at 1 of 3 bridges (if there are still space) at location:                  //
// [10.5, 1.5], [10.5, 10.5], [10.5, 19.5].                                         //
// - Power-ups are friendly-fired and have area of effect (AOE) damage. All units   //
// near the struck location will be affected. Use them wisely.                      //
// - The game is over when:                                                         //
//   + The main base of 1 team is destroyed. The other team is the winner.          //
//   + If all tanks of a team are destroyed, the other team is the winner.          //
//   + After 120 seconds, if both main bases are not destroyed, the team with more  //
//   side bases remaining is the winner.                                            //
//   + If both team have the same bases remaining, the game will change to “Sudden  //
//   Death” mode. In Sudden Death mode:                                             //
//     * 2 teams will play for extra 30 seconds.                                    //
//     * All destructible obstacles are removed.                                    //
//     * If 1 team can destroy any base, they are the winner.                       //
//     * After Sudden Death mode is over, the team has more tanks remaining is the  //
//     winner.                                                                      //
//   + The time is over. If it’s an active game (i.e. Some tanks and/or bases are   // 
//   destroyed), the result is a DRAW. If nothing is destroyed, it’s a BAD_DRAW.    //
//                                                                                  //
// Please read the detailed rule on our web site at:                                //
//   http://han-ai-contest2016.gameloft.com                                         //
//////////////////////////////////////////////////////////////////////////////////////

// ====================================================================================
//                                       NOTE:
// ====================================================================================
// Do not modify the code above, you won't be able to 'hack',
// all data sent to server is double checked there.
// Further more, if you cause any damage to the server or
// wrong match result, you'll be disqualified right away.
//
// 
//
// That's pretty much about it. Now, let's start coding.
// ====================================================================================






// ====================================================================================
// COMMAND FUNCTIONS: THESE ARE FUNCTIONS THAT HELP YOU TO CONTROL YOUR LITTLE ARMY
// ====================================================================================

// You call this function inside OnPlaceTankRequest() 4 times, to pick and place your tank.
// First param is the tank you want to use: TANK_LIGHT, TANK_MEDIUM or TANK_HEAVY.
// Then the coordinate you want to place. Must be integer.
function PlaceTank(type, x, y) {
	g_commandToBeSent += EncodeUInt8(COMMAND_CONTROL_PLACE);
	g_commandToBeSent += EncodeUInt8(type);
	g_commandToBeSent += EncodeUInt8(x >> 0);
	g_commandToBeSent += EncodeUInt8(y >> 0);
}

// You call this function inside Update(). This function will help you control your tank.
// - First parameter is the id of your tank (0 to 3), in your creation order when you placed your tank
// - Second parameter is the direction you want to turn your tank into. I can be DIRECTION_UP, DIRECTION_LEFT, DIRECTION_DOWN or DIRECTION_RIGHT.
// If you leave this param null, the tank will keep on its current direction.
// - Third parameter: True / False, whether to move your tank forward, or stay till.
// - Fourth parameter: True / False, whether to use your tank's main cannon. aka. Pew pew pew! Careful about the cooldown though.
function CommandTank (id, turn, move, shoot) {
	// Save to a list of command, and send later
	// This is to prevent player to send duplicate command.
	// Duplicate command will overwrite the previous one.
	// We just send one.
	// Turn can be null, it won't change a tank direction.
	if (turn != null) {
		clientCommands[id].m_direction = turn;
	}
	else {
		clientCommands[id].m_direction = g_tanks[g_team][id].m_direction;
	}
	
	clientCommands[id].m_move = move;
	clientCommands[id].m_shoot = shoot;
	clientCommands[id].m_dirty = true;
}


// You call this function to use the Airstrike powerup on a position
// Param is coordination. Can be float or integer.
// WARNING: ALL POWERUP ARE FRIENDLY-FIRE ENABLED.
// YOUR TANK OR YOUR BASE CAN BE HARM IF IT'S INSIDE THE AOE OF THE STRIKE
function UseAirstrike(x, y) {
	if (HasAirstrike()) {
		g_commandToBeSent += EncodeUInt8(COMMAND_CONTROL_USE_POWERUP);
		g_commandToBeSent += EncodeUInt8(POWERUP_AIRSTRIKE);
		g_commandToBeSent += EncodeFloat32(x);
		g_commandToBeSent += EncodeFloat32(y);
	}
}
// Same as above, but EMP instead of Airstrike.
function UseEMP(x, y) {
	if (HasEMP()) {
		g_commandToBeSent += EncodeUInt8(COMMAND_CONTROL_USE_POWERUP);
		g_commandToBeSent += EncodeUInt8(POWERUP_EMP);
		g_commandToBeSent += EncodeFloat32(x);
		g_commandToBeSent += EncodeFloat32(y);
	}
}

// This function is called at the end of the function Update or OnPlaceTankRequest.
// I've already called it for you, don't delete it.
function SendCommand () {
	// Send all pending command
	for (var i=0; i<NUMBER_OF_TANK; i++) {
		if (clientCommands[i].m_dirty == true) {
			g_commandToBeSent += EncodeUInt8(COMMAND_CONTROL_UPDATE);
			g_commandToBeSent += EncodeUInt8(i);
			g_commandToBeSent += EncodeUInt8(clientCommands[i].m_direction);
			g_commandToBeSent += EncodeUInt8(clientCommands[i].m_move);
			g_commandToBeSent += EncodeUInt8(clientCommands[i].m_shoot);
			
			clientCommands.m_dirty = false;
		}
	}
	Send (g_commandToBeSent);
	g_commandToBeSent = "";
}

// ====================================================================================
// HELPING FUNCTIONS: THESE ARE FUNCTIONS THAT HELP YOU RETRIEVE GAME VARIABLES
// ====================================================================================
function GetTileAt(x, y) {
	// This function return landscape type of the tile block on the map
	// It'll return the following value:
	// BLOCK_GROUND
	// BLOCK_WATER
	// BLOCK_HARD_OBSTACLE
	// BLOCK_SOFT_OBSTACLE
	// BLOCK_BASE
	
	return g_map[y * MAP_W + x];
}
function GetObstacleList() {
	// Return the obstacle list, both destructible, and the non destructible
	// This does not return water type tile.
	var list = [];
	for (var i=0; i<g_obstacles.length; i++) {
		list.push (g_obstacles);
	}
	for (var i=0; i<g_hardObstacles.length; i++) {
		list.push (g_hardObstacles);
	}
	return list;
}
function GetMyTeam() {
	// This function return your current team.
	// It can be either TEAM_1 or TEAM_2
	// Obviously, your opponent is the other team.
	return g_team;
}

function GetOpponentTeam() {
	if(g_team == TEAM_1)
		return TEAM_2;
	else
		return TEAM_1;
}

function GetMyTank(id) {
	// Return your tank, just give the id.
	return g_tanks[g_team][id];
}

function GetEnemyTank(id) {
	// Return enemy tank, just give the id.
	return g_tanks[(TEAM_1 + TEAM_2) - g_team][id];
}

function GetPowerUpList() {
	// Return active powerup list
	var powerUp = [];
	for (var i=0; i<g_powerUps.length; i++) {
		if (g_powerUps[i].m_active) {
			powerUp.push (g_powerUps[i]);
		}
	}
	
	return powerUp;
}

function HasAirstrike() {
	// Call this function to see if you have airstrike powerup.
	for (var i=0; i<g_inventory[g_team].length; i++) {
		if (g_inventory[g_team][i] == POWERUP_AIRSTRIKE) {
			return true;
		}
	}
	return false;
}

function HasEMP() {
	// Call this function to see if you have EMP powerup.
	for (var i=0; i<g_inventory[g_team].length; i++) {
		if (g_inventory[g_team][i] == POWERUP_EMP) {
			return true;
		}
	}
	return false;
}

function GetIncomingStrike() {
	var incoming = [];
	
	for (var i=0; i<g_strikes[TEAM_1].length; i++) {
		if (g_strikes[TEAM_1][i].m_live) {
			incoming.push (g_strikes[TEAM_1][i]);
		}
	}
	for (var i=0; i<g_strikes[TEAM_2].length; i++) {
		if (g_strikes[TEAM_2][i].m_live) {
			incoming.push (g_strikes[TEAM_2][i]);
		}
	}
	
	return incoming;
}

// ====================================================================================
// YOUR FUNCTIONS. YOU IMPLEMENT YOUR STUFF HERE.
// ====================================================================================
function OnPlaceTankRequest() {
	// This function is called at the start of the game. You place your tank according
	// to your strategy here.
	if (GetMyTeam() == TEAM_1) {
		PlaceTank(TANK_LIGHT, 5, 2);
		PlaceTank(TANK_MEDIUM, 3, 8);
		PlaceTank(TANK_HEAVY, 6, 10);
		PlaceTank(TANK_LIGHT, 4, 14);
	}
	else if (GetMyTeam() == TEAM_2) {
		// PlaceTank(TANK_LIGHT, 16, 4);
		// PlaceTank(TANK_MEDIUM, 17, 8);
		// PlaceTank(TANK_HEAVY, 17, 13);
		// PlaceTank(TANK_HEAVY, 16, 19);
		PlaceTank(TANK_MEDIUM, 16, 4);
		PlaceTank(TANK_MEDIUM, 17, 8);
		PlaceTank(TANK_MEDIUM, 17, 13);
		PlaceTank(TANK_MEDIUM, 16, 19);
	}
	
	// Leave this here, don't remove it.
	// This command will send all of your tank command to server
	SendCommand();
}

function Update() {
	// =========================================================================================================
	// Do nothing if the match is ended
	// You should keep this. Removing it probably won't affect much, but just keep it.
	// =========================================================================================================
	if(g_state == STATE_FINISHED) {
		if(((g_matchResult == MATCH_RESULT_TEAM_1_WIN) && (GetMyTeam() == TEAM_1)) || ((g_matchResult == MATCH_RESULT_TEAM_2_WIN) && (GetMyTeam() == TEAM_2))) {
			console.log("I WON. I WON. I'M THE BEST!!!");
		}
		else if(((g_matchResult == MATCH_RESULT_TEAM_2_WIN) && (GetMyTeam() == TEAM_1)) || ((g_matchResult == MATCH_RESULT_TEAM_1_WIN) && (GetMyTeam() == TEAM_2))) {
			console.log("DAMN, I LOST. THAT GUY WAS JUST LUCKY!!!");
		}
		else {
			console.log("DRAW.. BORING!");
		}
		return;
	}
	
	
	
	
	
	
	
	
	// =========================================================================================================
	// Check if there will be any airstrike or EMP
	// The GetIncomingStrike() function will return an array of strike object. Both called by your team
	// or enemy team.
	// =========================================================================================================
	var strike = GetIncomingStrike();
	for (var i=0; i<strike.length; i++) {
		var x = strike[i].m_x;
		var y = strike[i].m_y;
		var count = strike[i].m_countDown; // Delay (in server loop) before the strike reach the battlefield.
		var type = strike[i].m_type;
		
		if (type == POWERUP_AIRSTRIKE) {
			// You may want to do something here, like moving your tank away if the strike is on top of your tank.
		}
		else if (type == POWERUP_EMP) {
			// Run... RUN!!!!
		}
	}
	
	
	
	
	
	// =========================================================================================================
	// Get power up list on the map. You may want to move your tank there and secure it before your enemy
	// does it. You can get coordination, and type from this object
	// =========================================================================================================
	var powerUp = GetPowerUpList();
	for (var i=0; i<powerUp.length; i++) {
		var x = powerUp[i].m_x;
		var y = powerUp[i].m_y;
		var type = powerUp[i].m_type;
		if (type == POWERUP_AIRSTRIKE) {
			// You may want to move your tank to this position to secure this power up.
		}
		else if (type == POWERUP_EMP) {
			
		}
	}
	
	
	
	// =========================================================================================================
	// This is an example on how you command your tanks.
	// In this example, I go through all of my "still intact" tanks, and give them random commands.
	// =========================================================================================================
	// Loop through all tank (if not dead yet)

	for (var i=0; i<NUMBER_OF_TANK; i++) {
		var tempTank = GetMyTank(i);

		if(g_aTasks.length<NUMBER_OF_TANK) {
			g_aTasks.push(new Task(i, tempTank));
		}

		// Don't waste effort if tank was dead
		if((tempTank == null) ||(tempTank.m_HP == 0))
			continue;
		
		g_aTasks[i].performTask();
		continue;

		if(i == 1 || i == 2) {
			g_aTasks[i].performTask();
		} else {
			CommandTank (i, 0, false, false); // Turn into the direction, keep moving, and firing like there is no tomorrow
		}
	}
	


	
	// =========================================================================================================
	// This is an example on how you use your power up if you acquire one.
	// If you have airstrike or EMP, you may use them anytime.
	// I just give a primitive example here: I strike on the first enemy tank, as soon as I acquire power up
	// =========================================================================================================
	if (HasAirstrike()) {
		for (var i=0; i<NUMBER_OF_TANK; i++) {
			if (GetEnemyTank(i).m_HP > 0) {
				UseAirstrike (GetEnemyTank(i).m_x, GetEnemyTank(i).m_y); // BAM!!!
				break;
			}
		}
	}
	if (HasEMP()) {
		for (var i=0; i<NUMBER_OF_TANK; i++) {
			if (GetEnemyTank(i).m_HP > 0) {
				UseEMP (GetEnemyTank(i).m_x, GetEnemyTank(i).m_y);
				break;
			}
		}
	}
	
	//==== ThanhDK
	var nCurrentTime = mvnGetTimeMSFloat();

	//==== Tìm đường đến base của đối phương.
	if(nCurrentTime - g_nTimeFindPath>TIME_TO_FIND_PATH) {
		g_nTimeFindPath = nCurrentTime;

//		mvnFindPath(0);
	}


	// Leave this here, don't remove it.
	// This command will send all of your tank command to server
	SendCommand();
}


//==== dang.kien.thanh ==== BEGIN

//=== Tính thời gian theo microseconds.
function mvnGetTimeMSFloat() {
    var hrtime = process.hrtime();
    return ( hrtime[0] * 1000000 + hrtime[1] / 1000 ) / 1000;
}

//================================================ 
// Tìm đường đến base của đổi phương
// Xe tăng TANK_LIGHT số 1 sẽ tìm đường đển khu vực tổ của đối phương.
function mvnFindPath(tankNo) {
	g_bCalculating = true;
	var nTime = mvnGetTimeMSFloat();

	var tank = GetMyTank(tankNo);
	var tankIndex = tank.m_x + tank.m_y * MAP_W;
//	console.log(g_map);

	//==== clone map.
	var map = [];
	var mapScanned = [];
	var mapDistance = [];
	for(var i=0; i<MAP_W*MAP_H; i++) {
		map.push(g_map[i]);	// Max distance.
		mapScanned.push(0);	// 0: scanned; 1: not yet scanned.
		mapDistance.push(99);	// Ban đầu, khoảng cách là vô cực.
	}


	for (var i=0; i<NUMBER_OF_TANK; i++) {
		var enemy = GetEnemyTank(i);
		var idx = enemy.m_x  + enemy.m_y * MAP_W;
		map[idx] = MVN_ENEMY_TANK;	// Thực ra là xe địch, tạm thời đặt là tường đá.
	}

	for (var i=0; i<NUMBER_OF_TANK; i++) {
//		if(i == tankIndex) continue;	// Bỏ qua xe tăng đang được tìm đường.
		
		var myTank = GetMyTank(i);
		var idx = myTank.m_x  + myTank.m_y * MAP_W;
		map[idx] = (i == tankIndex)? MVN_CURRENT_TANK: MVN_MY_OTHER_TANK;	// Thực ra là xe của ta, nhưng là xe khác, tạm thời đặt là tường đá.
	}

	var nMoveable = 0;
	for(var i=0; i<MAP_W*MAP_H; i++) {
		if(map[i] == BLOCK_GROUND) {
			nMoveable++;
		} else {
			mapScanned[i] = 1;	// Coi như đã scan qua những ô chứa vật cản.
		}
	}

	dumpMap(map);
	mapDistance[tankIndex] = 0;

	mapScanned[tankIndex] = 0;
//	dumpScanned(mapScanned);

	var queue = [tankIndex];
	var prev = {};

	var nCheck = 0;
	while(queue.length>0) {
		var blockIdx = queue.shift();
		mapScanned[blockIdx] = 1;	// marked as scanned.
		
		for(var i=0, a =[blockIdx-1, blockIdx+1, blockIdx-MAP_W, blockIdx+MAP_W]; i<a.length; i++) {
			var idx = a[i];
			if(mapScanned[idx] == 0) {	// Chưa được quét.
				queue.push(idx);
				if(mapDistance[blockIdx] + 1 < mapDistance[idx]) {
					prev[idx] = blockIdx;
					mapDistance[idx] = mapDistance[blockIdx] + 1;
				}
			}
		}
	}
	console.log(mvnGetTimeMSFloat() - nTime);
//	dumpScanned(mapScanned);
	dumpDistance(mapDistance);

	var target = 10 * MAP_W + 4; 
	var path = [target];
	var o = prev[target];
	while(o != tankIndex) {
		path.push(o);
		o = prev[o];
	}
	g_bCalculating = false;
}

function dumpMap(map) {
	console.log("\n Map \n");
	for(var y=0; y<MAP_H; y++) {
		var b = [];
		for(var x=0; x<MAP_W; x++) {
			b.push(map[y * MAP_W + x]);
		}
		console.log(b);

	}
}
function dumpScanned(map) {
	console.log("\n Scanned \n");
	for(var y=0; y<MAP_H; y++) {
		var b = [];
		for(var x=0; x<MAP_W; x++) {
			b.push(map[y * MAP_W + x]);
		}
		console.log(b);

	}
}

function dumpDistance(map) {
	console.log("\n Distance \n");
	for(var y=0; y<MAP_H; y++) {
		var b = [];
		for(var x=0; x<MAP_W; x++) {
			var val = ("00" + map[y * MAP_W + x]).substr(-2);
			b.push(val);
		}
		console.log(b.join(" "));

	}
}

//======================== TASKS =============== BEGIN
//==== Trạng thái của tank.
var MVN_NO_TASK = 0;
var MVN_MOVE_TO_TARGET = 1;
var MVN_FIRE_TARGET = 2;

function Task(idx, tank) {
	console.log("Init Task for tank No", idx);

	this.tankNo = idx;
	this.tank = tank;
	this.m_task = MVN_NO_TASK;

	this.m_target_x = 0;	// mục tiêu tiếp theo
	this.m_target_y = 0;
	this.aPath = [];

	this.init();
}
//==== Kiểm tra xem trạng thái task hiện tại đã hoàn thành chưa?
// Chú ý tọa độ xy của tank đúng đến 0.25.
Task.prototype.isAtCheckPoint = function() {
	return this.m_target_x == this.tank.m_x 
		&& this.m_target_y == this.tank.m_y;
}


Task.prototype.moveToCheckPoint = function() {
	// if(this.tankNo != 1) {}
	// CommandTank (this.tankNo, null, false, false); // Turn into the direction, keep moving, and firing like there is no tomorrow


	var dx = this.m_target_x - this.tank.m_x;
	var dy = this.m_target_y - this.tank.m_y;

	// CommandTank (i, direction+1, true, false); // Turn into the direction, keep moving, and firing like there is no tomorrow
	var direction = this.tank.m_direction;
	if(dx > 0) {
		direction = DIRECTION_RIGHT;
	} else if (dx < 0) {
		direction = DIRECTION_LEFT;
	}

	if(dy > 0) {
		direction = DIRECTION_DOWN;
	} else if (dy < 0) {
		direction = DIRECTION_UP;
	}

	if(this.isObstacleAhead(direction)) {
		direction = (direction + Math.floor(Math.random() * 3)) % 4;
	}
	var bFire = this.isTargetAhead(direction);
	CommandTank (this.tankNo, direction, true, bFire); // Turn into the direction, keep moving, and firing like there is no tomorrow
}

Task.prototype.isObstacleAhead = function(direction) {
	var dx = 0, dy = 0;
	switch(direction) {
		case DIRECTION_UP: 	 	dy--;	break;
		case DIRECTION_DOWN: 	dy++;	break;
		case DIRECTION_LEFT: 	dx--;	break;
		case DIRECTION_RIGHT: 	dx++;	break;
	}

	dx *= 0.25;
	dy *= 0.25;

	var x = this.tank.m_x + dx;
	var y = this.tank.m_y + dy;

	for(var i=0; i<4; i++) {
		if(i == this.tankNo) continue;
		var o = GetMyTank(i);
		if(o.m_x <= x && x <= o.m_x+1 && o.m_y <= y && y <= o.m_y+1) return true;
	}

	for(var i=0; i<4; i++) {
		var o = GetEnemyTank(i);
//		if((o == null) || (o._hp != 0)) return true;
		if(o.m_x <= x && x <= o.m_x+1 && o.m_y <= y && y <= o.m_y+1) return true;
	}

	return false;
};

//===== Kiểm tra tọa độ XY có phải là tường hoặc base của mình.
//	Tường cứng, tường mềm bên mình, base bên mình: return true;
//	Else: return false;
Task.prototype.isOurStuffs = function(x, y) {
	for(var i=0, a=g_aObstacles[g_team].walls; i<a.length; i++) {
		var o = a[i];
		if(x <= o.x && o.x <=x+1 & y <= o.y && o.y <= y+1) {
//			if(this.tankNo == 1) console.log(this.tankNo, "walls", x, y, i, o.x, o.y);		
			return true;
		}
	}

	for(var i=0, a=g_aObstacles[g_team].bases; i<a.length; i++) {
		var o = a[i];
		if(x <= o.x && o.x <=x+1 & y <= o.y && o.y <= y+1) {
			if(this.tankNo == 1) console.log(this.tankNo, "bases", x, y, i, o.x, o.y);		
			return true;
		}
	}
	return false;

}

Task.prototype.isHardObstacle = function(x, y) {
	var idx = Math.round(x + y * MAP_W);

	// if(this.tankNo == 1 && g_map[idx] == BLOCK_HARD_OBSTACLE) {
	// 	console.log("isHardObstacle", x, y, x + y * MAP_W, idx, g_map[idx]);	
	// }
	return g_map[idx] == BLOCK_HARD_OBSTACLE;
};

//==== Kiểm tra xem trước mặt có mục tiêu hay không.
Task.prototype.isTargetAhead = function(direction) {
	if(direction == DIRECTION_UP) {
		for(var y=this.tank.m_y-1; y>0; y--) {
			if(this.isOurStuffs(this.tank.m_x, y)) return false;
			if(this.isHardObstacle(this.tank.m_x, y)) return true;
		}
	} else if (direction == DIRECTION_DOWN) {
		for(var y=this.tank.m_y+1; y<MAP_H; y++) {
			if(this.isOurStuffs(this.tank.m_x, y)) return false;
			if(this.isHardObstacle(this.tank.m_x, y)) return true;
		}
	} else if (direction == DIRECTION_LEFT) {
		for(var x=this.tank.m_x-1; x>0; x--) {
			if(this.isOurStuffs(x, this.tank.m_y)) return false;
			if(this.isHardObstacle(x, this.tank.m_y)) return true;
		}
	} else if (direction == DIRECTION_RIGHT) {
		for(var x=this.tank.m_x+1; x<MAP_W; x++) {
			if(this.isOurStuffs(x, this.tank.m_y)) return false;
			if(this.isHardObstacle(x, this.tank.m_y)) return true;
		}
	}

	return true;	// Ngoài những thứ cấm bắn, còn lại bắn, phá hết.
}

Task.prototype.performTask = function() {
//	console.log(["performTask", "tankNo", this.tank.tankNo, "m_task", this.m_task].join(" "));

	if(this.m_task == MVN_MOVE_TO_TARGET) {
		if(this.isAtCheckPoint()) {	// Đã đến checkpoint gần nhất?
			if(this.aPath.length>0) {	// Đã đến và còn checkpoint tiếp theo
				var point = this.aPath.shift();
				this.m_target_x = point.x;
				this.m_target_y = point.y;
				this.moveToCheckPoint();
			} else {	// Hết check point, chuyển sang chế độ khác (phá hủy xung quanh chẳng hạn)
				this.m_task = MVN_NO_TASK;
			}
		} else {
			this.moveToCheckPoint();	// Di chuyển đến checkpoint
		}
	} else if (this.m_task == MVN_NO_TASK) {
		if(this.tankNo == 1) console.log("no task")
		this.createNewTask();
	}
};

Task.prototype.createNewTask = function() {
	var direction = DIRECTION_DOWN;
	var a = g_aObstacles[GetOpponentTeam()].bases;
	for(var i=0; i<a.length; i++) {
		var o = a[i];
		if(o.x <= this.tank.m_x && this.tank.m_x <= o.x+1) {
			direction = o.y > this.tank.m_y? DIRECTION_DOWN : DIRECTION_UP;

			break;
		}
		if(o.y <= this.tank.m_y && this.tank.m_y <= o.y+1) {
			direction = o.x < this.tank.m_x? DIRECTION_LEFT : DIRECTION_RIGHT;
			break;
		}
	}

	this.m_task = MVN_FIRE_TARGET;
	CommandTank (this.tankNo, direction, true, true); // Turn into the direction, keep moving, and firing like there is no tomorrow
}
Task.prototype.init = function() {
	console.log("create task for tank No", this.tankNo);

	this.m_task = MVN_MOVE_TO_TARGET;

	
	var a = [
		[10, 9, 3, 2, 1, 0, 6]
	// 	[10, 9, 15, 14, 8, 7, 6],
	// 	[10, 9, 15, 14, 8, 7, 13],
	// //		[16, 22, 21, 27, 26, 25, 24, 18],
	// 	[16, 22, 21, 15, 14, 20, 19, 18]
	];
	this.aPath = this.checkPoints2Path(a[Math.floor(Math.random()*a.length)]);

	this.m_target_x = this.tank.m_x;
	this.m_target_y = this.tank.m_y;
}
Task.prototype.checkPoints2Path = function(a) {
	var path = [];
	for(var i=0; i<a.length; i++) {
		path.push(g_aCheckPoints[a[i]]);
	}

	return path;
}
//======================== TASKS =============== END


//==== VAR or CONSTANT ====
var g_aTasks = [];

var g_nTimestamp = mvnGetTimeMSFloat();
var g_nTimeFindPath = 0;
var g_bCalculating = false;

var TIME_TO_FIND_PATH = 100000;	// 3000ms tính lại chiến thuật 1 lần.
console.log(g_nTimestamp);



var g_aObstacles = {};
g_aObstacles[TEAM_1] = {
	walls: [
		{x: 7, y: 2},	{x: 6, y: 2}, 
		{x: 7, y: 3},	{x: 6, y: 3}, 
		{x: 7, y: 4},	{x: 6, y: 4}, 
		{x: 7, y: 5},	{x: 6, y: 5},

		{x: 7, y: 16},	{x: 6, y: 16},
		{x: 7, y: 17},	{x: 6, y: 17},
		{x: 7, y: 18},	{x: 6, y: 18},
		{x: 7, y: 19},	{x: 6, y: 19},

		{x: 1, y: 9},	{x: 2, y: 9},	{x: 3, y: 9},
		{x: 3, y: 10},	
		{x: 3, y: 11},
		{x: 3, y: 12},	{x: 2, y: 12},	{x: 1, y: 12}
	],
	bases: [
		{x: 4, y: 3},	{x: 3, y: 3}, 
		{x: 4, y: 4},	{x: 3, y: 4}, 

		{x: 4, y: 17},	{x: 3, y: 17},
		{x: 4, y: 18},	{x: 3, y: 18},

		{x: 2, y: 10},	{x: 1, y: 10},
		{x: 2, y: 11},	{x: 1, y: 11} 			
	]
};
g_aObstacles[TEAM_2] = {
	walls: [
		{x: 14, y: 2},	{x: 15, y: 2}, 
		{x: 14, y: 3},	{x: 15, y: 3}, 
		{x: 14, y: 4},	{x: 15, y: 4}, 
		{x: 14, y: 5},	{x: 15, y: 5},

		{x: 14, y: 16},	{x: 15, y: 16},
		{x: 14, y: 17},	{x: 15, y: 17},
		{x: 14, y: 18},	{x: 15, y: 18},
		{x: 14, y: 19},	{x: 15, y: 19},

		{x: 20, y: 9},	{x: 19, y: 9},	{x: 18, y: 9},
		{x: 18, y: 10},	
		{x: 18, y: 11},
		{x: 18, y: 12},	{x: 19, y: 12},	{x: 20, y: 12}
	],
	bases: [
		{x: 17, y: 3},	{x: 18, y: 3}, 
		{x: 17, y: 4},	{x: 18, y: 4}, 

		{x: 17, y: 17},	{x: 18, y: 17},
		{x: 17, y: 18},	{x: 18, y: 18},

		{x: 19, y: 10},	{x: 20, y: 10},
		{x: 19, y: 11},	{x: 20, y: 11} 			
	]
};


var g_aCheckPoints = [
	{x: 1, y: 1},	{x: 5, y: 1},	{x: 8, y: 1},	{x: 12, y: 1},	{x: 16, y: 1},	{x: 20, y: 1}, 
	{x: 1, y: 6},	{x: 5, y: 6},	{x: 8, y: 6},	{x: 12, y: 6},	{x: 16, y: 6},	{x: 20, y: 6}, 
	{x: 1, y: 10},	{x: 5, y: 10},	{x: 8, y: 10},	{x: 12, y: 10},	{x: 16, y: 10}, {x: 20, y: 10}, 
	{x: 1, y: 15},	{x: 5, y: 15},	{x: 8, y: 15},	{x: 12, y: 15},	{x: 16, y: 15},	{x: 20, y: 15}, 
	{x: 1, y: 20},	{x: 5, y: 20},	{x: 8, y: 20},	{x: 12, y: 20},	{x: 16, y: 20},	{x: 20, y: 20}

];
/*
var g_aStrategy = {};
g_aStrategy[TEAM_1] = [
	[10, 9, 3, 2, 1, 0, 6],
	[10, 9, 15, 14, 8, 7, 6],
	[10, 9, 15, 14, 8, 7, 13],
//		[16, 22, 21, 27, 26, 25, 24, 18],
	[16, 22, 21, 15, 14, 20, 19, 18]
];
*/
//==== dang.kien.thanh ==== END



