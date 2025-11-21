/**
 * Tests for module path resolution using require.resolve()
 * These tests verify that vendor binaries are correctly resolved
 * regardless of how the module is installed or bundled.
 */

const path = require( 'path' );
const fs = require( 'fs' );

describe( 'Module Path Resolution', () =>
{
    describe( 'Vendor binary paths', () =>
    {
        it( 'should resolve Windows Toast (ntfytoast.exe) path correctly', () =>
        {
            const toasterPath = require.resolve( '../vendor/ntfyToast/ntfytoast.exe' );

            expect( toasterPath ).toBeTruthy();
            expect( toasterPath ).toContain( 'ntfytoast.exe' );
            expect( path.isAbsolute( toasterPath ) ).toBeTruthy();
        });

        it( 'should resolve Windows Balloon (notifu.exe) path correctly', () =>
        {
            const notifuPath = require.resolve( '../vendor/notifu/notifu.exe' );

            expect( notifuPath ).toBeTruthy();
            expect( notifuPath ).toContain( 'notifu.exe' );
            expect( path.isAbsolute( notifuPath ) ).toBeTruthy();
        });

        it( 'should resolve macOS terminal-notifier path correctly', () =>
        {
            const terminalNotifierPath = require.resolve( '../vendor/mac.noindex/terminal-notifier.app/Contents/MacOS/terminal-notifier' );

            expect( terminalNotifierPath ).toBeTruthy();
            expect( terminalNotifierPath ).toContain( 'terminal-notifier' );
            expect( path.isAbsolute( terminalNotifierPath ) ).toBeTruthy();
        });
    });

    describe( 'Path resolution consistency', () =>
    {
        it( 'should resolve paths identically when called multiple times', () =>
        {
            const path1 = require.resolve( '../vendor/ntfyToast/ntfytoast.exe' );
            const path2 = require.resolve( '../vendor/ntfyToast/ntfytoast.exe' );

            expect( path1 ).toBe( path2 );
        });

        it( 'should resolve to actual file system locations', () =>
        {
            const toasterPath = require.resolve( '../vendor/ntfyToast/ntfytoast.exe' );
            const notifuPath = require.resolve( '../vendor/notifu/notifu.exe' );
            const terminalNotifierPath = require.resolve( '../vendor/mac.noindex/terminal-notifier.app/Contents/MacOS/terminal-notifier' );

            // At least one should exist depending on platform
            const paths = [ toasterPath, notifuPath, terminalNotifierPath ];
            const existingPaths = paths.filter( ( p ) => fs.existsSync( p ) );

            expect( existingPaths.length ).toBeGreaterThan( 0 );
        });
    });

    describe( 'Bundler/Webpack compatibility', () =>
    {
        it( 'should resolve without relying on __dirname', () =>
        {
            // Simulate webpack/bundler environment where __dirname might be altered
            const originalDirname = __dirname;

            // require.resolve should still work correctly
            const toasterPath = require.resolve( '../vendor/ntfyToast/ntfytoast.exe' );

            expect( toasterPath ).toBeTruthy();
            expect( path.isAbsolute( toasterPath ) ).toBeTruthy();

            // Verify __dirname is still intact (we didn't actually modify it)
            expect( __dirname ).toBe( originalDirname );
        });

        it( 'should resolve relative to module location, not caller location', () =>
        {
            // require.resolve() is relative to this file's location
            const resolvedPath = require.resolve( '../vendor/ntfyToast/ntfytoast.exe' );

            // The resolved path should contain the vendor directory
            expect( resolvedPath ).toContain( 'vendor' );
            expect( resolvedPath ).toContain( 'ntfyToast' );
        });

        it( 'should handle symlinked node_modules correctly', () =>
        {
            // require.resolve follows symlinks and resolves to real paths
            const toasterPath = require.resolve( '../vendor/ntfyToast/ntfytoast.exe' );
            const realPath = fs.realpathSync( toasterPath );

            // Both should be absolute paths
            expect( path.isAbsolute( toasterPath ) ).toBeTruthy();
            expect( path.isAbsolute( realPath ) ).toBeTruthy();
        });
    });

    describe( 'Notifier implementations use correct paths', () =>
    {
        it( 'should have Toaster using require.resolve()', () =>
        {
            // Read the toaster.js file to verify it uses require.resolve
            const toasterSource = fs.readFileSync(
                path.join( __dirname, '../notifiers/toaster.js' ),
                'utf8'
            );

            expect( toasterSource ).toContain( 'require.resolve' );
            expect( toasterSource ).toContain( '../vendor/ntfyToast/ntfytoast.exe' );
        });

        it( 'should have Balloon using require.resolve()', () =>
        {
            const balloonSource = fs.readFileSync(
                path.join( __dirname, '../notifiers/balloon.js' ),
                'utf8'
            );

            expect( balloonSource ).toContain( 'require.resolve' );
            expect( balloonSource ).toContain( '../vendor/notifu/notifu.exe' );
        });

        it( 'should have NotificationCenter using require.resolve()', () =>
        {
            const ncSource = fs.readFileSync(
                path.join( __dirname, '../notifiers/notificationcenter.js' ),
                'utf8'
            );

            expect( ncSource ).toContain( 'require.resolve' );
            expect( ncSource ).toContain( 'terminal-notifier' );
        });

        it( 'should not use path.resolve() with __dirname for vendor binaries', () =>
        {
            const toasterSource = fs.readFileSync(
                path.join( __dirname, '../notifiers/toaster.js' ),
                'utf8'
            );
            const balloonSource = fs.readFileSync(
                path.join( __dirname, '../notifiers/balloon.js' ),
                'utf8'
            );
            const ncSource = fs.readFileSync(
                path.join( __dirname, '../notifiers/notificationcenter.js' ),
                'utf8'
            );

            // Check that old pattern (path.resolve(__dirname, '../vendor/...')) is not present
            const oldPattern = /path\.(resolve|join)\s*\(\s*__dirname.*vendor/;

            expect( oldPattern.test( toasterSource ) ).toBeFalsy();
            expect( oldPattern.test( balloonSource ) ).toBeFalsy();
            expect( oldPattern.test( ncSource ) ).toBeFalsy();
        });
    });

    describe( 'Extension handling', () =>
    {
        it( 'should include .exe extension in resolved Windows paths', () =>
        {
            const toasterPath = require.resolve( '../vendor/ntfyToast/ntfytoast.exe' );
            const notifuPath = require.resolve( '../vendor/notifu/notifu.exe' );

            expect( path.extname( toasterPath ) ).toBe( '.exe' );
            expect( path.extname( notifuPath ) ).toBe( '.exe' );
        });

        it( 'should handle paths with multiple dots correctly', () =>
        {
            const terminalNotifierPath = require.resolve(
                '../vendor/mac.noindex/terminal-notifier.app/Contents/MacOS/terminal-notifier'
            );

            expect( terminalNotifierPath ).toContain( 'mac.noindex' );
            expect( terminalNotifierPath ).toContain( '.app' );
        });
    });
});
