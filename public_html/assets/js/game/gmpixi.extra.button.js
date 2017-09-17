
/* global PIXI, Function */

var GMPixi = GMPixi || Object.defineProperty(window, 'GMPixi', {
    value: {}
}).GMPixi;

GMPixi.extra = GMPixi.extra || Object.defineProperty(GMPixi, 'extra', {
    enumerable: true,
    value: {}
}).extra;

Object.defineProperty(GMPixi.extra, 'Button', {
    enumerable: true,
    value: function Button(text, onclick, textures) {
        PIXI.Container.call(this);
        
        //initialize the button object
        var button = new PIXI.Sprite();

        //sets its sprite pointers
        button.sprites = {
            down: textures('button_down'),
            up: textures('button_up'),
            hover: textures('button_hover'),
            w: textures('button_down').width,
            h: textures('button_down').height
        };

        //sets its reset function
        button.reset = function() {
            button.setTexture(button.sprites.up);
            button.inside = false;
            button.down = false;
            button.interactive = false;
        };

        //sets its on pointer event functions
        this.on('pointerout', function() {
            button.inside = false;
            button.setTexture(button.sprites.up);
        })

        .on('pointerover', function() {
            button.inside = true;
            button.setTexture(button.down 
                    ? button.sprites.down : button.sprites.hover);
        })

        .on('pointerdown', function() {
            button.down = true;
            button.setTexture(button.sprites.down);
        })

        .on('pointerupoutside', function() {
            button.down = false;
            button.setTexture(button.sprites.up);
        })

        .on('pointerup', function() {
            button.down = false;
            button.setTexture(button.sprites.up);

            //do something here
            onclick();
        });

        //adds the button to the container
        this.addChild(button);
        
        //setting the width and height of the play button
        this.width = button.sprites.w;
        this.height = button.sprites.h;

        //setting its pivot point
        this.pivot.x = this.width/2;
        this.pivot.y = this.height/2;
        
        //initialize the button text
        var btext = new PIXI.Text(text, {
            fill: 0xdfdfdf,
            fontFamily: "Century Gothic",
            fontWeight: "bold"
        });
        
        btext.position.set(this.width/2, this.height/2);
        btext.anchor.set(0.5);
        this.addChild(btext);
    }
});

Object.defineProperty(GMPixi.extra.Button, 'prototype', {
    value: Object.create(PIXI.Container.prototype)
});

Object.defineProperties(GMPixi.extra.Button.prototype, {
    reset: {
        enumerable: true,
        value: function reset() {
            for(var bc in this.children) {
                if(GMPixi.checkType(this.children[bc].reset, Function)) {
                    this.children[bc].reset();
                }
            }
            if(GMPixi.checkType(this.doReset, Function)) {
                this.doReset();
            }
        }
    }
});