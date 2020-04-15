

/* global GMPixi, PIXI, Function */


var game;
window.addEventListener('load', function() {
    game = new GMPixi.Game({
        resource: ['assets/sprite/minesweeper.json'],
        preroom: function() {
            var textures = PIXI.loader
                    .resources['assets/sprite/minesweeper.json'].textures;
            this.room.textures = function(name) {
                return textures['asset_' + name + '.png'] || null;
            };
            //disabling context menu on right click
            this.renderer.view.addEventListener('contextmenu', function(e) {
                e.preventDefault();
            });
        },
        room: {
            parent: 'game',
            renderer: 'canvas',
            width: 500,
            height: 440,
            position: 'center'
        },
        rooms: {
            menu: {
                setup: function() {
                    
                    /** The Background **/
                    
                    var animate = {};
                    
                    //initialization
                    var bg = this.add(
                            new PIXI.Sprite(this.room.textures('menu_bg')));
                    
                    //the reset function
                    bg.reset = function() {
                        bg.alpha = 0;
                        //first object so reset all animations here
                        animate.bg = 1;
                        animate.title = 1;
                        animate.play = 0;
                    };
                    
                    //the update function which does the animation
                    bg.update = function() {
                        if(bg.alpha < 1 && animate.bg > 0) {
                            bg.alpha = GMPixi.Math.clamp(bg.alpha+0.075, 0, 1);
                        }
                        else if(bg.alpha > 0 && animate.bg < 0) {
                            bg.alpha = GMPixi.Math.clamp(bg.alpha-0.1, 0, 1);
                        }
                    }.bind(this);
                    
                    /** The Title/Logo **/
                    
                    //initialization
                    var title = this.add(
                            new PIXI.Sprite(this.room.textures('logo')), 
                            -this.room.textures('logo').width, 
                            this.room.height/3, 0.5);
                    
                    //the reset function
                    title.reset = function() {
                        title.x = -title.width;
                        animate.title = 1;
                        title.vx = 25;
                        title.alpha = 1;
                    };
                    
                    //the update function which does the animation
                    title.update = function() {
                        if(bg.alpha >= 1 && animate.title > 0) {
                            title.x += title.vx;
                            if(title.x >= this.room.width * 0.6
                                    && title.vx > 0) {
                                title.vx = -25;
                            }
                            if(title.x <= this.room.width*0.5 
                                    && title.vx < 0) {
                                title.x = this.room.width*0.5;
                                animate.title = 0;
                                animate.play = 1;
                            }
                        }
                        else if(animate.title < 0) {
                            if(bg.alpha > 0) {
                                title.alpha = GMPixi.Math.clamp(
                                        title.alpha-0.1, 0, 1);
                            }
                            else {
                                //change room here
                                this.room.change('game');
                            }
                            
                        }
                    }.bind(this);
                    
                    /** The Play Button **/
                    
                    //create the container for the play button
                    var play = this.add(new GMPixi.extra.Button("Play", function() {
                        //init the exit animation
                        animate.play = -1;
                        play.vy = -20;
                        play.interactive = false;
                    }.bind(this), this.room.textures), this.room.width/2, 0);
                    
                    play.doReset = function() {
                        play.interactive = false;
                        play.y = this.room.height + play.height/2;
                        play.vy = -28;
                    }.bind(this);
                    

                    
                    play.update = function() {
                        if(animate.play > 0) {
                            play.y += play.vy;
                            if(play.y <= this.room.height * 0.6 
                                    && play.vy < 0) {
                                play.vy = 28;
                            }
                            if(play.y >= this.room.height * 0.65 
                                    && play.vy > 0) {
                                play.y = this.room.height * 0.65;
                                animate.play = 0;
                                play.interactive = true;
                            }
                        }
                        else if(animate.play < 0) {
                            play.y += play.vy;
                            if(play.y <= this.room.height * 0.6 
                                    && play.vy < 0) {
                                play.vy = 40;
                            }
                            if(play.y >= this.room.height + play.height/2
                                    && play.vy > 0) {
                                animate.play = 0;
                                //start the fade out of bg + title
                                animate.bg = -1;
                                animate.title = -1;
                            }
                        }
                    }.bind(this);
                }
            },
            
            game: {
                data: {
                    /**
                     * Total number of flags remaining to be mounted on the board
                     */
                    flags: 0,
                    
                    /**
                     * Total mines found on the board
                     */
                    minesTotal: 40,
                    
                    /**
                     * Total number of mines without flags
                     */
                    noFlagMines: 0,
                    
                    /**
                     * Number of tiles opened
                     */
                    openedTiles: 0,
                    
                    /**
                     * Is the game is running or not
                     */
                    playing: false,
                    
                    /**
                     * 
                     */
                    isExploding: false,
                    
                    /**
                     * Number of blocks per row
                     */
                    col_count: 15,
                    
                    /**
                     * Number of blocks per column
                     */
                    row_count: 14,
                    
                    /**
                     * Monitors whether left or right mouse button is clicked
                     */
                    clicked: {
                        left: false,
                        right: false
                    },
                    
                    /**
                     * Queue for starting the animations of the block
                     */
                    open: [],
                    
                    /** 
                     * Queue for monitoring which blocks are currently animating
                     */
                    opening: [],
                    
                    /**
                     * Queue for starting the exploding animations
                     */
                    explode: [],
                    
                    /**
                     * Queue for monitoring which blocks are currently exploding
                     */
                    exploding: [],
                    
                    /**
                     * For end game variables
                     */
                    endgame: {
                        
                        /**
                         * Check if a win or a lose
                         * true     -   win
                         * false    -   lose
                         */
                        status: false,
                        
                        /**
                         * Check if restart or main menu
                         * true     -   restart
                         * false    -   main menu
                         */
                        goto: false
                    }
                },
                methods: {
                    /**
                     * Function for opening the tile
                     */
                    openTile: function(obj) {
                        
                        if(obj.opened) return;  //not continue if already opened
                        
                            
                        obj.opened = true;
                        
                        //adds the obj to the open queue
                        this.open.push(obj);
                        
                        //disable any interactivity on the board while opening
                        this.board.setEnabled(false);
                        
                        /**
                         * if it is a space only, opens all nearby blocks 
                         * that are space and number at all direction
                         */
                        if(obj.type === 0) {
                            this.openSpace(obj);
                        }
                    },
                    
                    /**
                     * Function that will open up other spaces and number
                     * when space is clicked.
                     */
                    openSpace: function(obj) {
                        let x = obj.index.x;
                        let y = obj.index.y;
                        
                        let others = [
                            /**
                             * pointer to northern tile,
                             * null if no tile
                             */
                            y > 0 ? this.tiles[x][y-1] : null,
                            
                            /**
                             * pointer to southern tile,
                             * null if no tile
                             */
                            y < this.row_count - 1 ? this.tiles[x][y + 1] : null,
                            
                            /**
                             * pointer to western tile,
                             * null if no tile
                             */
                            x > 0 ? this.tiles[x - 1][y] : null,
                            
                            /**
                             * pointer to eastern tile,
                             * null if no tile
                             */
                            x < this.col_count - 1 ? this.tiles[x + 1][y] : null,
                            
                            /**
                             * pointer to northwestern tile,
                             * null if no tile
                             */
                            x > 0 && y > 0 ? this.tiles[x - 1][y - 1] : null,
                            
                            /**
                             * pointer to northeastern tile,
                             * null if no tile
                             */
                            x < this.col_count - 1 && y > 0 ? this.tiles[x + 1][y - 1] : null,
                            
                            /**
                             * pointer to southwestern tile,
                             * null if no tile
                             */
                            x > 0 && y < this.row_count - 1 ? this.tiles[x - 1][y + 1] : null,
                            
                            /**
                             * pointer to southeastern tile,
                             * null if no tile
                             */
                            x < this.col_count - 1 && y < this.row_count - 1 ? this.tiles[x + 1][y + 1] : null
                        ];
                        
                        /**
                         * Do this in a for-loop because everything is the same for all direction.
                         */
                        for(let i=0, other = others[i]; i<others.length; other = others[++i]) {
                            
                            /**
                             * If there is nothing, go to next
                             */
                            if(other === null || other.flagged || other.opened) continue;
                            
                            /**
                             * Check the type, adds to open queue if number or
                             * spaces, do not check if already opened or is
                             * flagged
                             */
                            if(other.type > -1) {
                                /**
                                 * Mark this first as opened so that it will 
                                 * not be checked again
                                 */
                                other.opened = true;
                                
                                //then add this to open queue
                                this.open.push(other);
                            }
                                
                            
                            /**
                             * Open space again if it is a space, if not,
                             * proceed to next
                             */
                            if(other.type === 0) {
                                this.openSpace(other);
                            }
                        }
                    },
                    explodeTile : function(obj) {
                        /**
                         * Adds the object to the explode array
                         */
                        this.explode.push(obj);
                        
                        /**
                         * Adds other bombs to explode array
                         */
                        this.noFlagMines++;
                        let i = this.getNoFlagMinesCount(obj);
                        
                        this.isExploding = true;
                        
                        /**
                         * Check if others are flagged, change sprite to x
                         * if wrong flagged
                         */
                        
                        for(let ind=this.random[++i], 
                                other=this.tiles[ind.x][ind.y]; 
                                i<this.random.length - 1; ind=this.random[++i], 
                                other=this.tiles[ind.x][ind.y]
                                ) {
                            if(other.flagged) {
                                other.flag.setTexture(other.flag.sprites.error);
                            }
                        }
                    },
                    
                    /**
                     * Makes the mines with no bombs explode.
                     */
                    getNoFlagMinesCount: function(obj) {
                        let i=0;
                        for(let ind=this.random[i], 
                                other=this.tiles[ind.x][ind.y]; 
                                i<this.minesTotal; ind=this.random[++i], 
                                other=this.tiles[ind.x][ind.y]
                                ) {
                            
                            if(other === obj) continue; 
                            if(other.flagged) {
                                other.cover.alpha = 0.35;
                                continue;
                            }
                            
                            this.noFlagMines++;
                            
                            /**
                             * adds to explode animations
                             */
                            this.explode.push(other);
                        }
                        return i;
                    }
                },
                setup: function() {
                    
                    /***********************************************************
                     ***********************************************************
                     ******************* The Game Proper ***********************
                     ***********************************************************
                     **********************************************************/
                    
                    /**********************************************************/
                    /**
                     * Create the game container, this will be the container of
                     * all the sprites pertaining to the game proper.
                     */
                    this.game = this.addContainer();
                    
                    /**
                     * The game update will call all its children update method
                     * every time room updates
                     */
                    this.game.update = function() {
                        for(var gc in this.game.children) {
                            if(GMPixi.checkType(this.game.children[gc].update, Function)) {
                                this.game.children[gc].update();
                            }
                        }
                    }.bind(this);
                    
                    /**
                     * The game reset will call all its children's reset method
                     * every time the room resets
                     */
                    this.game.reset = function() {
                        //do the children reset
                        for(var gc in this.game.children) {
                            if(GMPixi.checkType(this.game.children[gc].reset, Function)) {
                                this.game.children[gc].reset();
                            }
                        }
                    }.bind(this);
                    
                    /**
                     * Make the game interactive...
                     */
                    this.game.interactive = true;
                    
                    /**
                     * Do something on pointerdown and up.
                     */
                    this.game.on('pointerdown', function(e) {
                        e = e.data.originalEvent;
                        if(e.button === 0) {        //left click
                            this.clicked.left = true;
                        } else if(e.button === 2) { //right click
                            this.clicked.right = true;
                        }
                    }.bind(this)).on('pointerup', function(e) {
                        e = e.data.originalEvent;
                        if(e.button === 0) {        //left click
                            this.clicked.left = false;
                        } else if(e.button === 2) { //right click
                            this.clicked.right = false;
                        }
                    }.bind(this));
                    
                    
                    /**
                     *  Create the in-game background. first thing to be added
                     *  so that it will be on the lowest layer. 
                     */
                    this.addTo(new PIXI.Sprite(this.room.textures('ingame_bg')), this.game);
   
                    
                    /**
                     * The timer text will monitors the time elapsed while
                     * playing.
                     */
                    this.timer = this.addTo(new PIXI.Text("00:00", {
                        fill: 0xdddddd,
                        fontFamily: "Century Gothic"
                    }), this.game, this.room.width*0.395, this.room.height*0.905, 1, 0.5);
                    
                    /**
                     * This will reset the timer.
                     */
                    this.timer.reset = function() {
                        this.timer.text = "00:00";
                        this.timer.startTime = 0;
                    }.bind(this);
                    
                    /**
                     * Update the time in the timer every 30 steps if
                     * playing.
                     */
                    this.timer.update = function() {
                        if(this.playing) {
                            
                            if(this.timer.startTime <= 0) {
                                this.timer.startTime = Date.now();
                            }
                            
                            //end game when 100th minute time is reached explode all remaining bombs
                            //only show 99:59
                            if(Date.now() - this.timer.startTime >= 6000000) {
                                this.playing = false;
                                this.endgame.status = false;
                                this.getNoFlagMinesCount(null);
                                this.gameScreen.animate = true;
                                return;
                            }
                            
                            //do the update per 15 steps
                            if(this.room.steps%10 === 0) {
                                //checking how many seconds has passed
                                var tsec = Math.floor((Date.now() 
                                        - this.timer.startTime)/1000);
                                //get the number of minutes elapsed
                                var tmin = Math.floor(tsec/60);
                                //removing the number of minutes in tsec
                                tsec = tsec % 60;
                                //creating the string
                                var tstr = (tmin > 9 ? tmin : "0" + tmin) + ":" 
                                        + (tsec > 9 ? tsec : "0" + tsec);
                                this.timer.text = tstr;
                            }
                            
                            
                            
                        }
                    }.bind(this);
                    
                    /**
                     * This will monitor the number of flags currently mounted.
                     * Flagged tile are declared with bombs.
                     */
                    this.counter = this.addTo(new PIXI.Text(100, {
                        fill: 0xdddddd,
                        fontFamily: "Century Gothic"
                    }), this.game, this.room.width*0.77, this.room.height*0.905, 0.5, 0.5);
                    
                    /**
                     * The reset function of the counter.
                     */
                    this.counter.reset = function() {
                        this.counter.text = 0;
                        this.counter.animate = true;
                    }.bind(this);
                    
                    /**
                     * Just update the counter if flag is changed.
                     */
                    this.counter.update = function() {
                        if(!this.allScreen.animate && this.counter.animate) {
                            if((this.flags+=2) >= this.minesTotal) {
                                this.flags = this.minesTotal;
                                this.counter.animate = false;
                                this.board.setEnabled(true);
                            }
                        }
                        this.counter.text = this.flags;
                    }.bind(this);
                    
                    
                    /**
                     * Create the container which will contain the tiles to 
                     * where we will sweep bombs.
                     */
                    this.board = this.addTo(new PIXI.Container(), this.game);
                    
                    /**
                     * Sets its position/
                     */
                    this.board.position.set(this.room.width/5, 
                            this.room.height*0.09);
                    
                    
                    /**
                     * Do something on pointerdown and up.
                     */
                    this.board.on('pointerdown', function(e) {
                        if(!this.playing) return;
                        e = e.data.originalEvent;
                        if(e.button === 0) {        //left click
                            this.clicked.left = true;
                        } else if(e.button === 2) { //right click
                            this.clicked.right = true;
                        }
                        
                    }.bind(this)).on('pointerup', function(e) {
                        e = e.data.originalEvent;
                        if(e.button === 0) {        //left click
                            this.clicked.left = false;
                        } else if(e.button === 2) { //right click
                            this.clicked.right = false;
                        }
                    }.bind(this)).on('pointerupoutside', function(e) {
                        e = e.data.originalEvent;
                        if(e.button === 0) {        //left click
                            this.clicked.left = false;
                        } else if(e.button === 2) { //right click
                            this.clicked.right = false;
                        }
                    }.bind(this));;
                    
                    /**
                     * This will update all the tiles.
                     */
                    this.board.update = function() {
                        for(var bch in this.board.children) {
                            if(GMPixi.checkType(this.board.children[bch].update, Function)) {
                                this.board.children[bch].update();
                            }
                        }
                    }.bind(this);
                    
                    /**
                     * This will reset all the tiles.
                     */
                    this.board.reset = function() {
                        for(var bch in this.board.children) {
                            if(GMPixi.checkType(this.board.children[bch].reset, Function)) {
                                this.board.children[bch].reset();
                            }
                        }
                    }.bind(this);
                    
                    /**
                     * This will set whether the tiles can be clicked or not
                     */
                    this.board.setEnabled = function(enable) {
                        if(GMPixi.checkType(enable, Boolean)) enable = false;
                        for(var bch in this.board.children) {
                            this.board.children[bch].interactive = enable;
                        }
                        this.board.interactive = enable;
                    }.bind(this);
                    
                    /**
                     * Create the array that will hold the columns of tiles
                     */
                    this.tiles = [];
                    
                    
                    for(let m=0; m<this.col_count; ++m) {
                        /**
                         * Create the array the will hold the tiles
                         */
                        this.tiles.push([]);
                        
                        for(let n=0; n<this.row_count; ++n) {
                            //init the tile object
                            let obj = new PIXI.Container();
                            
                            /**************** for obj only ******************/
                            /**
                             * Pointer for the indices in the tiles array for further use
                             */
                            obj.index = { x: m, y: n };
                            
                            /**
                             * The one that monitors whether the mouse is inside this whole object
                             */
                            obj.inside = false;
                            
                            /**
                             * The one that monitors whether this tiles is flagged
                             */
                            obj.flagged = false;
                            
                            /**
                             * The one that monitors whether this tile is opened
                             */
                            obj.opened = false;
                            
                            /**
                             * Monitors the type of the object:
                             * 0 || =0   -   just an empty space
                             * 1 || >0   -   tiles with number
                             * -1 || <0  -   tiles with bombs
                             */
                            obj.type = 0;
                            
                            /**
                             * The width and the height of the object,
                             * useful for setting the positions of the object
                             * inside this object
                             */
                            obj.width = 
                                    this.room.textures('pressed_block').width;
                            obj.height = 
                                    this.room.textures('pressed_block').height;
                            
                            /**
                             * Create the pressed block
                             * This tile is the bottom most layer so that it is 
                             * hidden, this will not be modified again
                             * so we will not assign this to a variable
                             */
                            this.addTo(new PIXI.Sprite(
                                    this.room.textures('pressed_block')), obj);
                            
                            /**
                             * The text that indicates the number of bombs it
                             * is surrounded with.
                             */
                            obj.text = this.addTo(new PIXI.Text("", {
                                fontFamily: "Century Gothic",
                                fontSize: 12,
                                fontWeight: "bold"
                            }), obj, obj.width/2, obj.height/2, 0.5);
                            
                            /**
                             * Set the colors that will be shown based on the number
                             * of bombs surrounded
                             */
                            obj.text.colors = [
                                0x000000,   //0 - does nothing always invi
                                0x00ff00,   //1 - green
                                0xffff00,   //2 - yellow
                                0x0000ff,   //3 - blue
                                0xff0000,   //4 - red
                                0x00ffff,   //5 - cyan - don't know other colors
                                0xaaffaa,   //6 - some random color - just random low chance to get 6 & above ahhah
                                0x00aaff,   //7 - i don't know the result
                                0xffffff    //8 - white just like in heaven
                            ];
                            
                            /**
                             * Create the bomb sprite. The most important
                             * thing in this game.
                             */
                            obj.bomb = this.addTo(new PIXI.Sprite(
                                    this.room.textures('bomb')), obj,
                                    obj.width/2, obj.height/2, 0.5);
                            
                            /**
                             * The sprites for the explosions and bomb
                             */
                            obj.bomb.sprites = [];
                            
                            /**
                             * push all explosion sprites
                             */
                            for(let i=0, 
                                    spr=this.room.textures('explosion_' + i); 
                                    spr !== null; 
                                    spr = this.room.textures('explosion_' + (++i))) {
                                obj.bomb.sprites.push(spr);
                            }
                            
                            /**
                             * Push the default bomb sprite
                             */
                            obj.bomb.sprites.push(this.room.textures('bomb'));
                            
                            /**
                             * Set current sprite index
                             */
                            obj.bomb.pointer = 0;
                            
                            /**
                             * Create the cover tile that will hide the elements
                             * below to have an element of suprise.
                             */
                            obj.cover = this.addTo(new PIXI.Sprite(
                                    this.room.textures('unpressed_block')), obj);
                            
                            /**
                             * Create the flag for flagged attrib
                             */
                            obj.flag = this.addTo(new PIXI.Sprite(
                                    this.room.textures('flag')), obj);
                            
                            obj.flag.sprites = {
                                normal: this.room.textures('flag'),
                                error: this.room.textures('wrong')
                            };
                            
                            /**
                             * Setting the sprites for cover
                             */
                            obj.cover.sprites = {
                                normal: this.room.textures('unpressed_block'),
                                clicked: this.room.textures('pressed_block')
                            };
                            
                            /**
                             * This will set the location of the tile base on
                             * the indices (m as x and n as y). This is relative
                             * to the object container.
                             */
                            obj.x = obj.width * m;
                            obj.y = (obj.height+0.5)*n;
                            
                            
                            /**
                             * This function will set the color and text of the
                             * text object base on the passed arguments, default
                             * argument is 0
                             */
                            obj.setAsNumber = function(num) {
                                num = GMPixi.Math.toNumber(num);
                                obj.text.style.fill = obj.text.colors[num];
                                obj.text.text = num;
                                obj.type = 1;
                            };
                            
                            /**
                             * This function will set the current tile to a bomb
                             * hiding the text and showing the bomb.
                             */
                            obj.setAsBomb = function() {
                                obj.type = -1;
                                obj.bomb.visible = true;
                            };
                            
                            /**
                             * This function will be called on room reset.
                             * This will reset some defaults.
                             */
                            obj.reset = function() {
                                
                                //reset animation
                                obj.animate = false;
                                
                                //reset explode animation
                                obj.explode = false;
                                
                                //set flagged
                                obj.flagged = false;
                                
                                //reset opened;
                                obj.opened = false;
                                
                                //reset the type to space?
                                obj.type = 0;
                                
                                //hide the flag
                                obj.flag.visible = false;
                                
                                //set flag default sprite
                                obj.flag.setTexture(obj.flag.sprites.normal);
                                
                                //reset the text to empty
                                obj.text.text = "";
                                
                                //reset cover's alpha to 1
                                obj.cover.alpha = 1;
                                
                                //make the bomb invisible
                                obj.bomb.visible = false;
                                
                                //set default bomb sprite
                                obj.bomb.setTexture(obj.bomb.sprites[obj.bomb.sprites.length - 1]);
                                
                                //set the pointer
                                obj.bomb.pointer = 0;
                                
                                //make the object non-interactive
                                obj.interactive = false;
                            };
                           
                            /**
                             *  Create the events for each tiles 
                             */
                            obj.on('pointerup', function(e) {
                                
                                /*
                                 * You are now playing if you opened a tile
                                 */
                                this.playing = true;
                                
                                /**
                                 * Just a pointer to original mouse event
                                 */
                                e = e.data.originalEvent;
                                
                                
                                if(e.button === 0) {        //left click
                                    this.clicked.left = false;
                                    
                                    //setting the sprite
                                    if(obj.cover.texture !== obj.cover.sprites.normal)
                                        obj.cover.setTexture(obj.cover.sprites.normal);
                                    
                                    //open the tile if not flagged
                                    if(!obj.flagged) {
                                        this.openTile(obj);
                                    }
                                } else if(e.button === 2) { //right click
                                    this.clicked.right = false;
                                    
                                    //if not yet opened you can mount a flag
                                    if(!obj.opened) {
                                        
                                        //mount and unmount flag
                                        if(obj.flagged) {
                                            obj.flagged = false;
                                            obj.flag.visible = false;
                                            this.flags++;
                                        }
                                        else if(this.flags > 0) {
                                            obj.flagged = true;
                                            obj.flag.visible = true;
                                            this.flags--;
                                        }
                                    }
                                } 
                            }.bind(this)).on('pointerdown', function(e) {
                                
                                e = e.data.originalEvent;
                                if(e.button === 0) {        //left click
                                    this.clicked.left = true;
                                    //setting the sprite
                                    if(!obj.flagged) obj.cover.setTexture(obj.cover.sprites.clicked);
                                    
                                } else if(e.button === 2) { //right click
                                    this.clicked.right = true;
                                }
                            }.bind(this)).on('pointerupoutside', function(e) {
                                if(e.button === 0) {        //left click
                                    this.clicked.left = false;
                                    
                                    //set the sprite
                                    obj.cover.setTexture(obj.cover.sprites.normal);
                                    
                                } else if(e.button === 2) { //right click
                                    this.clicked.right = false;
                                }
                            }.bind(this)).on('pointerover', function() {
                                
                                //setting the sprite
                                obj.cover.setTexture(this.clicked.left ?
                                        !obj.flagged ? obj.cover.sprites.clicked :
                                        obj.cover.sprites.normal : obj.cover.sprites.normal);
                            }.bind(this)).on('pointerout', function() {
                                //if(!this.playing) return;
                                obj.inside = true;
                                //setting the sprite
                                obj.cover.setTexture(obj.cover.sprites.normal);
                            }.bind(this));
                            
                            /**
                             * Adds the update function
                             */
                            obj.update = function() {
                                if(obj.animate) {
                                    if(obj.cover.alpha > 0) {
                                        /**
                                         * Reduce the cover to show whats inside
                                         */
                                        obj.cover.alpha -= 0.08;
                                    }
                                    else {
                                        
                                        /**
                                         * Adds to opened tiles if not bomb
                                         */
                                        
                                        
                                        /**
                                         * Clamp alpha to zero
                                         */
                                        obj.cover.alpha = 0;
                                        
                                        /**
                                         * Stops the animation
                                         */
                                        obj.animate = false;
                                        
                                        
                                        /**
                                         * remove this object from the animating objects
                                         * if not a bomb
                                         */
                                        if(obj.type > -1) {
                                            /**
                                             * increment opened tiles if not bomb
                                             */
                                            this.openedTiles++;
                                            
                                            /**
                                             * check if all tiles with no bombs are opened
                                             */
                                            
                                            if(this.openedTiles >= this.row_count * this.col_count - this.minesTotal) {
                                                this.board.setEnabled(false);
                                                this.playing = false;
                                                this.endgame.status = true;
                                                this.gameScreen.animate = true;
                                            }
                                            else {
                                                this.opening.splice(this.open.indexOf(obj), 1);
                                            }
                                        }
                                        else {
                                            
                                            /**
                                             * Execute the game over
                                             */
                                            this.playing = false;
                                            
                                            /**
                                             * set interactive to false
                                             */
                                            this.board.setEnabled(false);
                                            
                                            /**
                                             * explode this tile
                                             */
                                            this.explodeTile(obj);
                                            
                                        }
                                        
                                    }
                                }
                                /**
                                 * Do the exploding animation here
                                 */
                                else if(obj.explode) {
                                    
                                    /**
                                     * Set the explosion sprite per frame
                                     */
                                    obj.bomb.setTexture(obj.bomb.sprites[obj.bomb.pointer++]);
                                    
                                    /**
                                     * Check if all sprite has been passed
                                     */
                                    if(obj.bomb.pointer >= obj.bomb.sprites.length) {
                                        
                                        /**
                                         * stop the explosion animation
                                         */
                                        obj.explode = false;
                                        
                                        /**
                                         * Remove the object from the array that is exploding
                                         */
                                        this.exploding.splice(this.exploding.indexOf(obj), 1);
                                        
                                        /**
                                         * If ever all objects are exploded, start the end-game
                                         * animation
                                         */
                                        if(this.exploding.length <= 0) {
                                            this.endgame.status = false;
                                            this.gameScreen.animate = true;
                                        }
                                    }
                                }
                                
                            }.bind(this);
                            
                            /**
                             * Adds this object to the board as a child
                             */
                            this.board.addChild(obj);
                            
                            /**
                             * Push this object to the tiles so that we
                             * can access this later.
                             */
                            this.tiles[m].push(obj);
                        }
                    }
                    
                    /**
                     * Create the array for the not-so-random position for
                     * the bomb.
                     */
                    this.random = [];
                    for(let m=0; m<this.col_count; ++m) {
                        for(let n=0; n<this.row_count; ++n) {
                            this.random.push(this.tiles[m][n].index);
                        }
                    }
                    
                    
                    /***********************************************************
                     ***********************************************************
                     *************** The Game Black Screen *********************
                     ***********************************************************
                     **********************************************************/
                    
                    this.gameScreen = this.addContainer();
                    /** Create the graphics that will draw black rectangle **/
                    var blackBlock = this.addTo(new PIXI.Graphics(), this.gameScreen);
                    blackBlock.beginFill(0x000000);
                    blackBlock.drawRect(0, 0, this.room.width, this.room.height);
                    blackBlock.endFill();
                    
                    /**
                     * The number of frames/steps to pause before dimming to end game screen
                     */
                    this.gameScreen.defaultTimer = 70;
                    
                    /**
                     * The game screen reset
                     */
                    this.gameScreen.reset = function() {
                        this.gameScreen.animate = false;
                        this.gameScreen.alpha = 0;
                        this.gameScreen.timer = this.gameScreen.defaultTimer;
                    }.bind(this);
                    
                    /**
                     * Game screen update
                     */
                    this.gameScreen.update = function() {
                        if(this.gameScreen.animate){
                            //just timer do not do beyond this (if) if not yet 0
                            if(this.gameScreen.timer > 0) {
                                this.gameScreen.timer--;
                                return;
                            }
                            
                            //fade up to 0.65 alpha, 0.07 per step
                            if(this.gameScreen.alpha < 0.65) {
                                this.gameScreen.alpha += 0.07;
                            }
                            else {
                                //clamp alpha to 0.65
                                this.gameScreen.alpha = 0.65;
                                
                                //end game screen animation
                                this.gameScreen.animate = false;
                                
                                if(this.endgame.status) {
                                    this.congrats.animate = 1; //execute win sequence
                                }
                                else {
                                    this.gameOver.animate = true;   //execute lose sequence
                                }
                                
                                
                            }
                        }
                    }.bind(this);
                    
                    
                    /***********************************************************
                     ***********************************************************
                     ******************* The Lose Screen ***********************
                     ***********************************************************
                     **********************************************************/
                    
                    /**
                     * create the game over title (Lose)
                     */
                    this.gameOver = this.add(
                            new PIXI.Sprite(
                            this.room.textures('game_over_header')), 
                            0, this.room.height/4, 0.5);
                            
                    //the reset function
                    this.gameOver.reset = function() {
                        //at the beginning make it left of the screen
                        this.gameOver.x = -this.gameOver.width/2;
                        
                        //just set the pixels per step horizontal when animating
                        this.gameOver.vx = 50;
                    }.bind(this);
                    
                    /**
                     * The update function
                     */
                    this.gameOver.update = function() {
                        if(this.gameOver.animate) {
                            
                            /*
                             * Move left or right based on vx
                             * vx > 0   -   right
                             * vx < 0   -   left
                             * vx = 0   -   no movement
                             */
                            this.gameOver.x += this.gameOver.vx;
                            
                            /**
                             * First animation:
                             * Go to the 60% of the room width
                             */
                            if(this.gameOver.x >= this.room.width * 0.6 &&
                                    this.gameOver.vx > 0 ) {
                                this.gameOver.vx = -50;
                            }
                            
                            /**
                             * Second animation:
                             * Go back to 50% of the room width
                             * Then end animation
                             */
                            else if(this.gameOver.x <= this.room.width/2 &&
                                    this.gameOver.vx < 0 ) {
                                this.gameOver.animate = false;
                                this.gameOver.x = this.room.width/2;
                               //this.play.animate = 1;
                               this.endTime.animate = true;
                            }
                        }
                    }.bind(this);
                    
                    
                    
                    
                    /***********************************************************
                     ***********************************************************
                     ******************* The Win Screen ************************
                     ***********************************************************
                     **********************************************************/
                    
                    /**
                     * The text for congratulations
                     */
                    this.congrats = this.add(new PIXI.Text("Congratulations!", {
                        fill: [0xffffff, 0xdddddd, 0xffffff],
                        fontFamily: "Rockwell",
                        fontSize: 60,
                        fontStyle: 'italic',
                        stroke: 0x000000,
                        strokeThickness: 2
                    }), this.room.width/2, 0, 0.5);
                    
                    //reset function
                    this.congrats.reset = function() {
                        //scale to 0 so that not visible on startup
                        this.congrats.scale.x = 0;
                        this.congrats.scale.y = 0;
                        
                        //do not animate on startup
                        this.congrats.animate = 0;
                        
                        //no movement on startup;
                        this.congrats.vy = 0;
                        
                        //move to the center of the screen
                        this.congrats.y = this.room.height/2;
                        
                        //the delay after congratulating
                        this.congrats.timer = 40;
                    }.bind(this);
                    
                    /**
                     * Update function
                     */
                    this.congrats.update = function() {
                        if(this.congrats.animate > 0) {
                            if(this.congrats.scale.x < 1) {
                                /**
                                 * First animation:
                                 * Zoom in effects
                                 */
                                this.congrats.scale.x += 0.07;
                                this.congrats.scale.y = this.congrats.scale.x;
                            }
                            else {
                                //just clamp scale to 1
                                this.congrats.scale.x = 1;
                                this.congrats.scale.y = this.congrats.scale.x;
                                
                                //disable animation
                                this.congrats.animate = 0;
                                
                                //do the fireworks thingy
                                for(let f in this.fireworks) {
                                    this.fireworks[f].animate = true;
                                }
                            }
                        }
                        
                        //move to a bit upper part of the screen but delay first by 40 steps
                        else if(this.congrats.animate < 0) {
                            if(this.congrats.timer > 0) {
                                this.congrats.timer--;
                                return;
                            }
                            
                            //the movement, also decrease a bit the scale so will not cover much space
                            if(this.congrats.y > this.room.height/4) {
                                this.congrats.y -= 10;
                                this.congrats.scale.x -= 0.03;
                                this.congrats.scale.y = this.congrats.scale.x;
                            }
                            
                            //ends animation
                            else {
                                this.congrats.y = this.room.height/4;
                                this.congrats.animate = 0;
                                this.endTime.animate = true;
                            }
                        }
                    }.bind(this);
                    
                    /**
                     * The firework events
                     */
                    this.fireworks = [];
                    
                    //setting the color of the firework
                    var f_clr = ['firework_red_', 'firework_green_', 'firework_blue_'];
                    
                    //setting object per color
                    for(let i=0; i<f_clr.length; ++i) {
                        
                        //the sprite creation
                        let obj = this.add(new PIXI.Sprite(), 
                                this.room.width * (i+1)/4, 0, 0.5);
                        
                        //the target location from bottom
                        obj.targetY = this.room.height * (0.25 + 0.05*i);
                        
                        //the speed upward
                        obj.vy = 20;
                        
                        //the current sprite index to be shown
                        obj.pointer = 0;
                        
                        //the sprites that will be shown
                        obj.sprites = [];
                        
                        //adds the sprites to the array, iterate until null
                        for(let j=0, 
                                spr=this.room.textures(f_clr[i] + j); 
                                spr !== null; 
                                spr = this.room.textures(f_clr[i] + (++j))) {
                            obj.sprites.push(spr);
                        }
                        
                        //the reset function
                        obj.reset = function() {
                            
                            //go back to bottom
                            obj.y = this.room.height * (0.8 + 0.05*i);
                            
                            //set pointer to 1, 1 because pointer will be used in animation
                            obj.pointer = 1;
                            
                            //initial texture
                            obj.setTexture(obj.sprites[0]);
                            
                            //not visible at first
                            obj.visible = false;
                            
                            //do not animate at first
                            obj.animate = false;
                            
                            //do not exit at first
                            obj.exit = false;
                        }.bind(this);
                        
                        /**
                         * The update function
                         */
                        obj.update = function() {
                            if(obj.animate) {
                                
                                //make the fireworks visible
                                obj.visible = true;
                                
                                //fly through the sky
                                if(obj.y > obj.targetY && !obj.exit) {
                                    obj.y -= obj.vy;
                                }
                                
                                //if reaches the target
                                else if(obj.y <= obj.targetY && obj.pointer <= 0) {
                                    obj.y = obj.targetY;
                                    
                                    //change the sprite
                                    obj.setTexture(obj.sprites[++obj.pointer]);
                                }
                                
                                //if going down due to gravity
                                else if(obj.exit) {
                                    obj.y += 5;
                                    if(obj.y > this.room.height + obj.height/2) {
                                        obj.animate = false;
                                    }
                                } 
                                
                                //the animation explosion of fireworks do per 4 steps
                                else if(obj.pointer > 0 && this.room.steps % 4 === 0){
                                    obj.setTexture(obj.sprites[++obj.pointer]);
                                    if(obj.pointer >= obj.sprites.length - 1) {
                                        obj.exit = true;
                                        
                                        for(let k in this.firework) {
                                            //check if all fireworks finishes animation
                                            if(this.firework.animate[k]) {
                                                return;
                                            }
                                        }
                                        
                                        //reanimate congrats going up
                                        this.congrats.animate = -1;
                                    }
                                }
                            }
                        }.bind(this);
                        
                        //adds to the fireworks array
                        this.fireworks.push(obj);
                        
                    }
                    
                    
                    /***********************************************************
                     ***********************************************************
                     ***************** The Win-Lose Screen *********************
                     ***********************************************************
                     **********************************************************/
                    
                    /**
                     * The end time GUI
                     */
                    this.endTime = this.addContainer();
                    let et_box = this.addTo(
                            new PIXI.Sprite(this.room.textures('timer_container')), 
                            this.endTime);
                    this.endTime.width = et_box.width;
                    this.endTime.height = et_box.height;
                    this.endTime.pivot.x = this.endTime.width/2;
                    this.endTime.pivot.y = this.endTime.height/2;
                    
                    this.endTime.time = [0, 0, 0, 0, 0];
                    
                    let et_text = this.addTo(
                            new PIXI.Text(0, {
                                fill: 0xdddddd,
                                fontFamily: "Century Gothic"
                            }), this.endTime, this.endTime.width*0.9, this.endTime.height/2, 1, 0.5
                        );
                
                        
                    this.endTime.reset = function() {
                        this.endTime.position.set(this.room.width/2, this.room.height + this.endTime.height/2);
                        et_text.text = "00:00";
                        for(let n in this.endTime.time) this.endTime.time[n] = 0;
                        this.endTime.animate = false;
                        this.endTime.exit = false;
                    }.bind(this);
                        
                    this.endTime.update = function() {
                        if(this.endTime.animate) {
                            
                            let ix = this.room.width/2 - (!this.endgame.status ? this.endTime.width/4 : 0);
                            
                            if(this.endTime.y > this.room.height/2) {
                                this.endTime.y -= 35;
                                this.endTime.x = ix;
                            }
                            else if(this.endTime.y <= this.room.height/2
                                    && this.endTime.x >= ix) {
                                
                                this.endTime.y = this.room.height/2;
                                
                                if(this.room.steps % 5 !== 0) return;
                                
                                let gt = this.timer.text.split('');

                                this.endTime.time[2] = ":";

                                for(let n in this.endTime.time) {
                                    if(gt[n] !== this.endTime.time[n].toString() && n !== 2) {
                                        this.endTime.time[n] += 1;
                                    }
                                };

                                et_text.text = this.endTime.time.join('');

                                if(et_text.text === this.timer.text) {
                                    if(this.endgame.status) {
                                        this.play.animate = true;
                                        this.endTime.animate = false;
                                    }
                                    else {
                                        this.endTime.x -= 20;
                                    }
                                    
                                }
                            }
                            else if(this.endTime.x > this.room.width/2 - this.endTime.width * 0.75) {
                                this.endTime.x -= 20;
                            } else if(this.endTime.x <= this.room.width/2 - this.endTime.width * 0.75) {
                                this.endTime.x = this.room.width/2 - this.endTime.width * 0.75;
                                this.endTime.animate = false;
                                this.mineCounter.animate = true;
                            }
                        }
                        else if(this.endTime.exit) {
                            if(this.endTime.y < this.room.height + this.endTime.height/2) {
                                this.endTime.y += 35;
                            }
                            else if(!this.mineCounter.exit){
                                this.endTime.exit = true;
                                this.allScreen.exit = true;
                            }
                        }
                        
                     }.bind(this);
                    
                    
                    /**
                     * The bombs counter
                     */
                    this.mineCounter = this.addContainer();
                    let mc_box = this.addTo(
                            new PIXI.Sprite(this.room.textures('bomb_container')), 
                            this.mineCounter);
                    this.mineCounter.width = mc_box.width;
                    this.mineCounter.height = mc_box.height;
                    this.mineCounter.pivot.x = this.mineCounter.width/2;
                    this.mineCounter.pivot.y = this.mineCounter.height/2;
                    
                    let mc_text = this.addTo(
                            new PIXI.Text(0, {
                                fill: 0xdddddd,
                                fontFamily: "Century Gothic"
                            }), this.mineCounter, this.mineCounter.width*0.9, this.mineCounter.height/2, 1, 0.5
                        );
                    
                    this.mineCounter.reset = function() {
                        this.mineCounter.position.set(this.room.width/2, this.room.height + this.mineCounter.height/2);
                        mc_text.text = 0;
                        this.mineCounter.animate = false;
                        this.mineCounter.count = 0;
                        this.mineCounter.exit = false;
                    }.bind(this);
                        
                    this.mineCounter.update = function() {
                        if(this.mineCounter.animate) {
                            
                            let ix = this.room.width/2 + this.mineCounter.width/4;
                            
                            if(this.mineCounter.y > this.room.height/2) {
                                this.mineCounter.x = ix;
                                this.mineCounter.y -= 35;
                            }
                            else if(this.mineCounter.y <= this.room.height/2
                                    && this.mineCounter.x <= ix) {
                                
                                this.mineCounter.y = this.room.height/2;
                                
                                this.mineCounter.count++;
                                mc_text.text = this.mineCounter.count;
                                if(this.mineCounter.count >= this.noFlagMines) {
                                    this.mineCounter.x += 20;
                                }
                            }
                            else if(this.mineCounter.x < this.room.width/2 + this.mineCounter.width * 0.75) {
                                this.mineCounter.x += 20;
                            } else if(this.mineCounter.x >= this.room.width/2 + this.mineCounter.width * 0.75) {
                                this.mineCounter.x = this.room.width/2 + this.mineCounter.width * 0.75;
                                this.mineCounter.animate = false;
                                this.play.animate = true;
                            }
                        }
                        else if(this.mineCounter.exit) {
                            if(this.mineCounter.y < this.room.height + this.mineCounter.height/2) {
                                this.mineCounter.y += 35;
                            }
                            else {
                                this.mineCounter.exit = false;
                            }
                        }
                     }.bind(this);
                    
                    
                    this.play = this.add(new GMPixi.extra.Button("Restart",
                            function(){
                                //init the exit animation
                                this.menu.animate = -1;
                                this.menu.vy = -40;
                                this.menu.interactive = false;
                                this.play.interactive = false;
                                
                                //set to restart game
                                this.endgame.goto = true;
                                
                            }.bind(this), this.room.textures), 
                            this.room.width/2, 0);
                        
                    this.play.defaultY = this.room.height * 0.7;
                    
                    this.play.doReset = function() {
                        this.play.interactive = false;
                        this.play.y = this.room.height + this.play.height/2;
                        this.play.vy = -32;
                    }.bind(this);
        
                    this.play.update = function() {
                        if(this.play.animate > 0) {
                            this.play.y += this.play.vy;
                            if(this.play.y <= this.play.defaultY - this.room.height/20
                                    && this.play.vy < 0) {
                                this.play.vy = 38;
                            }
                            else if(this.play.y >= this.play.defaultY
                                    && this.play.vy > 0) {
                                this.play.y = this.play.defaultY;
                                this.play.animate = 0;
                                
                                this.menu.animate = 1;
                                
                            }
                        }
                        else if(this.play.animate < 0) {
                            this.play.y += this.play.vy;
                            if(this.play.y <= this.play.defaultY - this.room.height/20
                                    && this.play.vy < 0) {
                                this.play.vy = 38;
                            }
                            else if(this.play.y >= this.room.height + this.play.height/2
                                    && this.play.vy > 0) {
                                this.play.animate = 0;
                                if(this.endgame.status) {
                                    this.endTime.exit = true;
                                }
                                else {
                                    this.endTime.exit = true;
                                    this.mineCounter.exit = true;
                                }
                            }
                        }
                    }.bind(this);                 
                    
                    this.menu = this.add(new GMPixi.extra.Button("Menu",
                            function(){
                                //init the exit animation
                                this.menu.animate = -1;
                                this.menu.vy = -32;
                                this.menu.interactive = false;
                                this.play.interactive = false;
                                
                                //set to main menu
                                this.endgame.goto = false;
                            }.bind(this), this.room.textures), 
                            this.room.width/2, 0);
                            
                    this.menu.defaultY = this.play.defaultY + this.play.height * 1.5;
                    
                    this.menu.doReset = function() {
                        this.menu.interactive = false;
                        this.menu.y = this.room.height + this.menu.height/2;
                        this.menu.vy = -32;
                    }.bind(this);
        
                    this.menu.update = function() {
                        if(this.menu.animate > 0) {
                            this.menu.y += this.menu.vy;
                            if(this.menu.y <= this.menu.defaultY - this.room.height/20
                                    && this.menu.vy < 0) {
                                this.menu.vy = 38;
                            }
                            else if(this.menu.y >= this.menu.defaultY 
                                    && this.menu.vy > 0) {
                                this.menu.y = this.menu.defaultY;
                                this.menu.animate = 0;
                                this.menu.interactive = true;
                                this.play.interactive = true;
                            }
                        }
                        else if(this.menu.animate < 0) {
                            this.menu.y += this.menu.vy;
                            if(this.menu.y <= this.menu.defaultY - this.room.height/20 
                                    && this.menu.vy < 0) {
                                this.menu.vy = 38;
                            }
                            else if(this.menu.y >= this.room.height + this.menu.height/2
                                    && this.menu.vy > 0) {
                                this.menu.animate = 0;
                                this.play.animate = -1;
                                this.play.vy = 38;
                            }
                        }
                    }.bind(this);
                    
                    /***********************************************************
                     ***********************************************************
                     ******************* The Black Screen **********************
                     ***********************************************************
                     **********************************************************/
                    
                    
                    this.allScreen = this.addContainer();
                    /** Create the graphics that will draw black rectangle **/
                    var blackBlock = this.addTo(new PIXI.Graphics(), this.allScreen);
                    blackBlock.beginFill(0x000000);
                    blackBlock.drawRect(0, 0, this.room.width, this.room.height);
                    blackBlock.endFill();
                    
                    this.allScreen.reset = function() {
                        this.allScreen.animate = true;
                        this.allScreen.exit = false;
                        this.allScreen.alpha = 1;
                    }.bind(this);
                    
                    this.allScreen.update = function() {
                        if(this.allScreen.animate){
                            if(this.allScreen.alpha > 0) {
                                this.allScreen.alpha -= 0.07;
                            }
                            else {
                                this.allScreen.alpha = 0;
                                this.allScreen.animate = false;
                            }
                        }
                        else if(this.allScreen.exit) {
                            if(this.allScreen.alpha < 1) {
                                this.allScreen.alpha += 0.07;
                            }
                            else {
                                this.allScreen.alpha = 1;
                                this.allScreen.exit = false;
                                this.room.change(this.endgame.goto ? 'game' : 'menu');
                            }
                        }
                    }.bind(this);
                },
                update: function() {
                    if(this.playing) {
                        if(this.open.length > 0) {
                            this.board.setEnabled(false);
                            let obj = this.open.splice(0, 1)[0];
                            obj.animate = true;
                            this.opening.push(obj);
                        }
                        else if(this.opening.length > 0) {
                            this.board.setEnabled(true);
                        }
                    }
                    if(this.isExploding) {
                        if(this.explode.length > 0) {
                            this.board.setEnabled(false);   //ensure disability to click blocks
                            
                            /**
                             * Remove the first object to start it
                             */
                            let obj = this.explode.splice(0, 1)[0];
                            
                            /**
                             * Force open block
                             */
                            obj.cover.alpha = 0;
                            
                            /**
                             * Initialize its animation
                             */
                            obj.explode = true;
                        }
                    }
                },
                reset: function() {
                    
                    /**********************************************************
                     ******************** GAME PROPER  ************************
                     **********************************************************/
                    
                    /**
                     * reset open and opening arrays
                     */
                    this.open = [];
                    this.opening = [];
                    
                    /**
                     * reset explode and exploding arrays
                     */
                    this.explode = [];
                    this.exploding = [];
                    
                    /**
                     * reset the flag counts
                     */
                    this.flags = 0;
                    
                    /**
                     * reset no flag mines
                     */
                    this.noFlagMines = 0;
                    
                    /**
                     * reset opened tiles
                     */
                    this.openedTiles = 0;
                    
                    /**
                     * Disable all the tiles
                     */
                    this.board.setEnabled(false);
                    
                    /**
                     * Not-so-randomize the random array so that different 
                     * locations of bomb per game.
                     */
                    this.random = GMPixi.Math.shuffle(this.random);
                    
                    /**
                     * Make the first (total mines) to be bombs.
                     */
                    for(let n=0; n<this.minesTotal; ++n) {
                        this.tiles[this.random[n].x][this.random[n].y].setAsBomb();
                    }
                    
                    /**
                     * setting the numbers and spaces
                     * spaces   -    the tile is not surrounded by any bomb
                     * numbers  -   the tile is surrounded by at least a bomb
                     */
                    for(let m=0; m<this.col_count; ++m) {
                        for(let n=0; n<this.row_count; ++n) {
                            
                            /**
                             * Do not do this if it is a bomb
                             */
                            if(this.tiles[m][n].type < 0) continue;
                            
                            /**
                             * reset the bomb count
                             */
                            let bomb_count = 0;
                            
                            /**
                             * Create the array to check if type is not a bomb or not
                             */
                            let otile_types_check = [
                                m > 0 ? this.tiles[m - 1][n].type < 0: false,               //left
                                m > 0 && n > 0 ? this.tiles[m - 1][n - 1].type < 0 : false, //top-left
                                n > 0 ? this.tiles[m][n - 1].type < 0 : false,
                                m < this.col_count - 1 && n > 0 ? this.tiles[m + 1][n - 1].type < 0 : false,
                                m < this.col_count - 1 ? this.tiles[m + 1][n].type < 0 : false,
                                m < this.col_count - 1 && n < this.row_count - 1 ? this.tiles[m + 1][n + 1].type < 0 : false,
                                n < this.row_count - 1 ? this.tiles[m][n + 1].type < 0 : false,
                                m > 0 && n < this.row_count - 1 ? this.tiles[m - 1][n + 1].type < 0 : false
                            ];
                            
                            //if bomb add to bomb_count
                            for(let i=0, c=otile_types_check[i]; i<otile_types_check.length; c=otile_types_check[++i]) {
                                if(c) bomb_count++;
                            }
                            
                            //setting the texts
                            if(bomb_count > 0) {
                                this.tiles[m][n].setAsNumber(bomb_count);
                            }
                        }
                    }
                    
                    /**********************************************************
                     ****************** END-GAME SCREEN  **********************
                     **********************************************************/
                    this.firework_animate = false;
                }
            }
        }
    });
});


