var oop = require('iai-oop')
  , path = require('path')
  , util = require('util')
  , f = util.format
  , EventEmitter = require('events').EventEmitter
  // hidde "already required" messages from this modules
  , hiddenMods = ['iai-oop', 'iai-component'];
;

// will store a reference to the first component created
var root;
// will store the component's cache
var cached = {};

/**
 * 
 * Component factory method
 *
 */

var core = module.exports = function( pathname ){
  var id = require.resolve( pathname );
  if ( !cached[ id ] ) {
    cached[ id ] = iaiComponent.create( id );
  }
  return cached[ id ];
}

/**
 * This emitter allows catching component logs and errors
 * from anywere you like. To access it, use 
 * `require('iai-component').notifier`
 *
 * @event 'log'
 *   - message `String` the log message
 * This event is emitted any time a component logs something
 *
 * @event 'error'
 *   - error `Error` the error
 * This event is emitted any time a component throws an error
 *
 * @event 'ready'
 *   - id `String` the id of the component that triggered it
 * This event is emitted once any time a component throws an error
 */

var notify = new EventEmitter();

notify.log = function(){
  this.emit( 'log', f.apply( {}, arguments ) );
  return this;
}
notify.error = function(){
  this.emit( 'error', new Error( f.apply({}, arguments) ) );
}

core.notifier = notify;


// the name of the iai-info namespace on package.json files
var INFO_NAME = core.INFO_NAME = 'iai-info';


// default info constructor
function defaultInfo(){};
defaultInfo.prototype = require( './default-iai.json' );

Component = new oop.Interface( 'Component', ['load'] );

// helper to catch module not found errors
// without hidding other errors
function catchNotFound( tryfn, catchfn ){
  try {
    tryfn.call( this );
  } catch(e) {
    if( !~e.message.search(/cannot find module/i) ){
      throw e;
    }
    catchfn.call( this, e );
  }
}

/*
 * @prototype IaiComponent
 *   A chainable API that helps building and managing modular components.
 *   More info on the README file
 *   @constructor
 *     @param id (String)
 */

iaiComponent = oop.create(oop.Prototype, {
//  _loaded: [],
//  index: {},
//  id: 'unknown',
//  info: {},
  implement: [ Component ],
  /**
   * sets a property as data descriptor
   * meant for internal use
   */
  _def: function( name, value ){
    Object.defineProperty( this, name, { value: value } );
  },
  /**
   * error & log notifiers
   * meant for internal use
   */
  _log: function() {
    notify.log( "%s: %s",
                this.toString(),
                f.apply( {}, arguments )
    );
  },
  _err: function() {
    notify.error( "%s error, %s",
                  this.toString(),
                  f.apply( {}, arguments )
    );
  },
  /**
   * Initializer
   */
  init: function( pathname ) {
    if( arguments.length != 1 ) {
      throw ArityError( 'expecting exacly 1 argument' );
    }
    if(typeof pathname !== 'string') {
      throw TypeError( 'expecting param 1 to be a string' );
    }

    this._def( 'id', require.resolve( pathname ) );
    if( !root ) {
      root = this;
      notify
        .log( 'initializing root component on:' )
        .log( this.id )
        .log( 'NOTE: "[module] already required" messages' )
        .log( '      will be omitted for the following modules:' )
      ;
      for( var i in hiddenMods )
        notify.log( '      * %s', hiddenMods[i] );
    }
    // TODO 
    // TODO  IS THIS NEED REALLY?
    // TODO 
    // TODO 
    require( pathname )
    // TODO 
    // TODO  OF COURSE IT IS
    // TODO 
    // TODO 

    // get the default iai-info values
    // and the module package
    var info = new defaultInfo()
      , pkgdir = this.id
      , pkg
    ;
    // look up the directory tree until 
    // a package.json file is found
    while( !pkg && pkgdir != '/' ){
      catchNotFound.call(this, function(){
        pkg = require( path.join( pkgdir, 'package.json' ) );
      }, function(){
        pkgdir = path.dirname( pkgdir );
      });
    }
    if( !pkg ) {
      this._err( 'path is not within a node package' )
    }
    info.pkg = pkg;
    info.pkgdir = pkgdir;

    // extend de default iai-info values
    for( var k in pkg[ INFO_NAME ] ){
      info[ k ] = pkg[ INFO_NAME ][ k ];
    }

    // TODO validate and store the component info
    if( !info.name ) {
      info.name = path.basename( this.id )
                  .replace( path.extname( this.id ), '' )
      ;
      if ( info.name == 'index' ) {
        info.name = path.basename( path.dirname( this.id ) );
      }
    }
    this._def( 'info', info );

    // loading cache
    Object.defineProperty( this, '_loaded', {
      value: [], writable: true
    });
    // TODO childs ??
    /* Object.defineProperty( this, '_childs', {
      value: [], writable: true
    });*/

    // Is the package main module?
    var is_main = RegExp( '^'
      + path.join( this.info.pkgdir, this.info.pkg.main )
    ).test( this.id );


    // only main modules check required dependencies
    // and allow setting a global reference
    if( is_main ) {
      this._log( 'is the package main module'
               + ' and will check for dependencies' );
    
      for( var n in pkg.dependencies ){
        catchNotFound.call(this, function(){
          this.load( n );
        }, function(e){
          this._err( '%s ("%s") %s <%s> %s "%s" %s',
                     "missing dependency", n,
                     "for component", this.info.name,
                     "with id", this.id, e.message
          );
        });
      }
    }

    // set the global reference if it is desired
    // avoid overwriting main components
    if( !!info.scope && is_main ){
      var dotted = info.scope.split( '.' )
        , reference = global
      ;
      while( dotted.length > 1 ){
        reference = reference[ dotted.shift() ];
      }
      dotted = dotted.shift();
      if ( reference[ dotted ] !== undefined ) {
        this._err( 'reference "%s" in use', info.scope );
      }
      else {
        reference[ dotted ] = this;
        this._log( 'reference set on %s', info.scope );
      }
    }

    this._log( 'ready as %s.', is_main? 'main':'sub' );
  },
  /**
   * load sub-component
   * throws an error if component is not found
   */
  load: function( cname ){
    // TODO skip loading if require has cached it
/*    var modid;
    catchNotFound.call(this, function(){
      modid = require.resolve( cname )
    }, function(e){
      this._log( 'require failed', require.main.filename );
      modid = path.join( path.dirname( this.id ), cname );
    });
    if( require.cache[ modid ] ) {
      // don't log "already required" when requiring
      // iai-component or iai-oop
      if( !~hiddenMods.indexOf( cname ) ){
        this._log( '"%s" already required.', cname );
      }
      return this;
    }*/

    // skip loading if already loaded on component cache
    if( !!~this._loaded.indexOf( cname ) ) {
      this._log( '"%s" already loaded.', cname );
      return this;
    } else {
      this._loaded.push( cname );
    }

    this._log( 'loading "%s"...', cname );

    // check if component name is an alias
    var is_alias = false;
    if( this.info.aliases.hasOwnProperty(cname) ) {
      cname = this.info.aliases[ cname ];
      is_alias = true;
    }

    // require the desired component
    var mod = require.cache[ this.id ].require( cname );

    // extend the current component if desired
    var is_cmp = iaiComponent.isPrototypeOf( mod );
    var loginfo = "but did nothing with it";
    if ( this.info.extend == 'always'
      || this.info.extend == 'auto' && ( is_alias || is_cmp )
    ){
      if ( is_cmp ) {
        loginfo = f( "and stored it as '%s'", mod.info.name);
        this[ mod.info.name ] = mod;
      }
      else {
        loginfo = "and extends from it";
        for( var fname in mod ) {
          this[fname] = mod[fname];
        }
      }
    }

    this._log( 'has loaded "%s" %s.', cname, loginfo );

    return this;
  },
  toString: function() {
    return f( 'Component <%s%s>',
              this.info.name || this.id,
              ( '@' + this.info.pkg.name ) || ''
    );
  }
});

module.exports.Component = iaiComponent;
