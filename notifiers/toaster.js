/*
    Wrapper for the toaster (https://github.com/nels-o/toaster)
*/

const notifier = require.resolve( '../vendor/ntfyToast/ntfytoast.exe' ); // Require resolve will use relative pathing correctly
const utils = require( '../lib/utils' );
const Balloon = require( './balloon' );
const crypto = require( 'crypto' );

// const os = require('os');

const EventEmitter = require( 'events' ).EventEmitter;
const util = require( 'util' );

let fallback;

const PIPE_NAME = 'notifierPipe';
const PIPE_PATH_PREFIX = '\\\\.\\pipe\\';
const PIPE_PATH_PREFIX_WSL = '/tmp/';

module.exports = WindowsToaster;

function WindowsToaster( options )
{
    options = utils.clone( options || {});

    if ( !( this instanceof WindowsToaster ) )
        return new WindowsToaster( options );

    this.options = options;

    EventEmitter.call( this );
}
util.inherits( WindowsToaster, EventEmitter );

function noop() {}

function parseResult( data )
{
    if ( !data )
        return {};

    return data.split( ';' ).reduce( ( acc, cur ) =>
    {
        const split = cur.split( '=' );

        if ( split && split.length === 2 )
            acc[ split[ 0 ] ] = split[ 1 ];

        return acc;
    }, {});
}

function getPipeName()
{
    const pathPrefix = utils.isWSL() ? PIPE_PATH_PREFIX_WSL : PIPE_PATH_PREFIX;
    const uuid = crypto.randomUUID();
    return `${ pathPrefix }${ PIPE_NAME }-${ uuid }`;
}

function notifyRaw( options, callback )
{
    options = utils.clone( options || {});
    callback = callback || noop;

    // const is64Bit = os.arch() === 'x64';
    let resultBuffer;
    const server =
    {
        namedPipe: getPipeName()
    };

    if ( typeof options === 'string' )
        options = { title: 'toasted-notifier', message: options };

    if ( typeof callback !== 'function' )
        throw new TypeError( 'The second argument must be a function callback. You have passed ' + typeof fn );

    /*
        Possible exit statuses from NtfyToast, we only want to include err if it's -1 code
            Exit Status     :  Exit Code
            Failed          : -1

            Success         :  0
            Hidden          :  1
            Dismissed       :  2
            TimedOut        :  3
            ButtonPressed   :  4
            TextEntered     :  5
    */

    const ntfyToastResultParser = ( err, callback ) =>
    {
        const result = parseResult( resultBuffer && resultBuffer.toString( 'utf16le' ) );

        // parse action
        if ( result.action === 'buttonClicked' && result.button )
            result.activationType = result.button;
        else if ( result.action )
            result.activationType = result.action;

        if ( err && err.code === -1 )
            callback( err, result );

        callback( null, result );

        /*
            Due to an issue with ntfytoast not using stdio and pipe
            when notifications are disabled, make sure named pipe server
            is closed before exiting.
        */

        server.instance && server.instance.close();
    };

    const actionJackedCallback = ( err ) =>
        ntfyToastResultParser(
            err,
            utils.actionJackerDecorator( this, options, callback, ( data ) =>
                data === 'activate' ? 'click' : data || false
            )
        );

    options.title = options.title || 'Example Notification:';
    if ( typeof options.message === 'undefined' && typeof options.close === 'undefined' )
    {
        callback( new Error( 'Message or ID to close is required.' ) );
        return this;
    }

    if ( !utils.isWin8() && !utils.isWSL() && !!this.options.withFallback )
    {
        fallback = fallback || new Balloon( this.options );
        return fallback.notify( options, callback );
    }

    // Add pipeName option, to get the output
    utils.createNamedPipe( server ).then( ( out ) =>
    {
        resultBuffer = out;
        options.pipeName = server.namedPipe;

        // No need to append .exe since require.resolve() already includes the full extension
        const localNotifier = options.customPath || this.options.customPath || notifier;
        // options.customPath || this.options.customPath || notifier + '-x' + (is64Bit ? '64' : '86') + '.exe';

        options = utils.mapToWin8( options );
        const argsList = utils.constructArgumentList( options,
        {
            explicitTrue: true,
            wrapper: '',
            keepNewlines: true,
            noEscape: true
        });

        utils.fileCommand( localNotifier, argsList, actionJackedCallback );
    });

    return this;
}

Object.defineProperty( WindowsToaster.prototype, 'notify',
{
    get: function ()
    {
        if ( !this._notify ) this._notify = notifyRaw.bind( this );
        return this._notify;
    }
});
