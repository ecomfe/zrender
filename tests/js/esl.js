/**
 * ESL (Enterprise Standard Loader)
 * Copyright 2013 Baidu Inc. All rights reserved.
 * 
 * @file Browser端标准加载器，符合AMD规范
 * @author errorrik(errorrik@gmail.com)
 */

var define;
var require;

(function ( global ) {
    // "mod_"开头的变量或函数为内部模块管理函数
    // 为提高压缩率，不使用function或object包装
    var require = createLocalRequire( '' );

    /**
     * 定义模块
     * 
     * @param {string=} id 模块标识
     * @param {Array=} dependencies 依赖模块列表
     * @param {Function=} factory 创建模块的工厂方法
     */
    function define() {
        var id;
        var dependencies;
        var factory;

        for ( var i = 0, len = arguments.length; i < len; i++ ) {
            var arg = arguments[ i ];

            switch ( typeof arg ) {
                case 'string':
                    id = arg;
                    break;
                case 'function':
                    factory = arg;
                    break;
                case 'object':
                    if ( !dependencies && isArray( arg ) ) {
                        dependencies = arg;
                    }
                    else {
                        factory = arg;
                    }
                    break;
            }
        }
        
        // 出现window不是疏忽
        // esl设计是做为browser端的loader
        // 闭包的global更多意义在于：
        //     define和require方法可以被挂到用户自定义对象中
        var opera = window.opera;

        // IE下通过current script的data-require-id获取当前id
        if ( 
            !id 
            && document.attachEvent 
            && (!(opera && opera.toString() === '[object Opera]')) 
        ) {
            id = getCurrentScript().getAttribute( 'data-require-id' );
        }

        // 纪录到共享变量中，在load或readystatechange中处理
        currentScriptDefines.push( {
            id      : id,
            deps    : dependencies || [],
            factory : factory
        } );
    }

    define.amd = {};

    /**
     * 模块容器
     * 
     * @inner
     * @type {Object}
     */
    var mod_modules = {};

    /**
     * 模块未初始化状态码
     * 
     * @inner
     * @type {number}
     */
    var MODULE_STATE_UNINIT = 0;

    /**
     * 模块已初始化状态码
     * 
     * @inner
     * @type {number}
     */
    var MODULE_STATE_INITED = 1;

    /**
     * 定义模块
     * 
     * @inner
     * @param {string} id 模块标识
     * @param {Function} factory 模块定义函数 
     * @param {Array.<string>} factoryArgs 声明参数模块列表
     * @param {Array.<string>} hardDepends 强依赖模块列表
     * @param {Array.<string>} depends 依赖模块列表
     */
    function mod_define( id, factory, factoryArgs, hardDepends, depends ) {
        var module = {
            id           : id,
            factoryArgs  : factoryArgs,
            hardDeps     : hardDepends,
            deps         : depends || [],
            factory      : factory,
            exports      : {},
            state        : MODULE_STATE_UNINIT
        };

        // 将模块预存入defining集合中
        mod_modules[ id ] = module;

        // 内建模块
        var buildinModule = {
            require : createLocalRequire( id ),
            exports : module.exports,
            module  : module
        };

        mod_addInitedListener( initModule );
        initModule();

        /**
         * 判断依赖加载完成
         * 
         * @inner
         * @return {boolean}
         */
        function isInitReady() {
            var isReady = 1;
            each( hardDepends, function ( id ) {
                isReady = id in BUILDIN_MODULE || mod_isInited( id );
                return isReady;
            } );

            return isReady;
        }

        /**
         * 初始化模块
         * 
         * @inner
         */
        function initModule() {
            if ( mod_isInited( id ) || !isInitReady() ) {
                return;
            }

            // 构造factory参数
            var args = [];
            each( 
                factoryArgs,
                function ( moduleId, index ) {
                    args[ index ] = 
                        buildinModule[ moduleId ]
                        || mod_getModuleExports( moduleId );
                } 
            )

            // 调用factory函数初始化module
            try {
                var exports = typeof factory == 'function'
                    ? factory.apply( global, args )
                    : factory;

                if ( typeof exports != 'undefined' ) {
                    module.exports = exports;
                }
            } 
            catch ( ex ) {
                if ( ex.message.indexOf('[MODULE_MISS]') === 0 ) {
                    return;
                }

                throw ex;
            }
            
            module.state = MODULE_STATE_INITED;
            mod_removeInitedListener( initModule );
            
            mod_fireInited( id );
        }
    }

    /**
     * 模块初始化事件监听器
     * 
     * @inner
     * @type {Array}
     */
    var mod_initedListener = [];

    /**
     * 模块初始化事件监听器的移除索引
     * 
     * @inner
     * @type {Array}
     */
    var mod_removeListenerIndex = [];

    /**
     * 模块初始化事件fire层级
     * 
     * @inner
     * @type {number}
     */
    var mod_fireLevel = 0;

    /**
     * 触发模块初始化事件
     * 
     * @inner
     * @param {string} id 模块标识
     */
    function mod_fireInited( id ) {
        mod_fireLevel++;
        each( 
            mod_initedListener,
            function ( listener ) {
                listener && listener( id );
            }
        );
        mod_fireLevel--;

        mod_sweepInitedListener();
    }

    /**
     * 清理模块定义监听器
     * mod_removeInitedListener时只做标记
     * 在mod_fireInited执行清除动作
     * 
     * @inner
     * @param {Function} listener 模块定义监听器
     */
    function mod_sweepInitedListener() {
        if ( mod_fireLevel < 1 ) {
            mod_removeListenerIndex.sort( function ( a, b ) { return b - a; });

            each( 
                mod_removeListenerIndex,
                function ( index ) {
                    mod_initedListener.splice( index, 1 );
                }
            );
            
            mod_removeListenerIndex = [];
        }
    }

    /**
     * 移除模块定义监听器
     * 
     * @inner
     * @param {Function} listener 模块定义监听器
     */
    function mod_removeInitedListener( listener ) {
        each(
            mod_initedListener,
            function ( item, index ) {
                if ( listener == item ) {
                    mod_removeListenerIndex.push( index );
                }
            }
        );
    }

    /**
     * 添加模块定义监听器
     * 
     * @inner
     * @param {Function} listener 模块定义监听器
     */
    function mod_addInitedListener( listener ) {
        mod_initedListener.push( listener );
    }

    /**
     * 判断模块是否已定义
     * 
     * @inner
     * @param {string} id 模块标识
     * @return {boolean}
     */
    function mod_exists( id ) {
        return id in mod_modules;
    }

    /**
     * 判断模块是否已初始化完成
     * 
     * @inner
     * @param {string} id 模块标识
     * @return {boolean}
     */
    function mod_isInited( id ) {
        return mod_exists( id ) 
            && mod_modules[ id ].state == MODULE_STATE_INITED;
    }

    /**
     * 获取模块的exports
     * 
     * @inner
     * @param {string} id 模块标识
     * @return {*}
     */
    function mod_getModuleExports( id ) {
        if ( mod_exists( id ) ) {
            return mod_modules[ id ].exports;
        }

        return null;
    }

    /**
     * 获取模块
     * 
     * @inner
     * @param {string} id 模块标识
     * @return {Object}
     */
    function mod_getModule( id ) {
        return mod_modules[ id ];
    }

    /**
     * 添加资源
     * 
     * @inner
     * @param {string} resourceId 资源标识
     * @param {*} value 资源对象
     */
    function mod_addResource( resourceId, value ) {
        mod_modules[ resourceId ] = {
            exports: value || true,
            state: MODULE_STATE_INITED
        };

        mod_fireInited( resourceId );
    }

    /**
     * 当前script中的define集合
     * 
     * @inner
     * @type {Array}
     */
    var currentScriptDefines = [];

    /**
     * 内建module名称集合
     * 
     * @inner
     * @type {Object}
     */
    var BUILDIN_MODULE = {
        require : require,
        exports : 1,
        module  : 1
    };

    /**
     * 完成模块定义
     * 
     * @inner
     */
    function completeDefine( currentId ) {
        var requireModules = [];
        var pluginModules = [];
        var defines = currentScriptDefines.slice( 0 );

        currentScriptDefines.length = 0;
        currentScriptDefines = [];

        // 第一遍处理合并依赖，找出依赖中是否包含资源依赖
        each(
            defines,
            function ( defineItem, defineIndex ) {
                var id = defineItem.id || currentId;
                var depends = defineItem.deps;
                var factory = defineItem.factory;
                
                if ( mod_exists( id ) ) {
                    return;
                }

                // 处理define中编写的依赖声明
                // 默认为['require', 'exports', 'module']
                if ( depends.length === 0 ) {
                    depends.push( 'require', 'exports', 'module' );
                }

                // 处理实际需要加载的依赖
                var realDepends = [];
                defineItem.realDeps = realDepends;
                realDepends.push.apply( realDepends, depends );

                // 分析function body中的require
                var requireRule = /require\(\s*(['"'])([^'"]+)\1\s*\)/g;
                var commentRule = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg;
                if ( typeof factory == 'function' ) {
                    factory.toString()
                        .replace( commentRule, '' )
                        .replace( requireRule, function ( $0, $1, $2 ) {
                            realDepends.push( $2 );
                        });
                }

                // 分析resource加载的plugin module id
                each(
                    realDepends,
                    function ( dependId ) {
                        var idInf = parseId( dependId );
                        if ( idInf.resource ) {
                            pluginModules.push( normalize( idInf.module, id ) );
                        }
                    }
                );
            }
        );
        
        // 尝试加载"资源加载所需模块"，后进行第二次处理
        // 需要先加载模块的愿意是：如果模块不存在，无法进行资源id normalize化
        // pretreatAndDefine处理所有依赖，并进行module define
        nativeRequire( pluginModules, pretreatAndDefine );

        /**
         * 判断模块是否在后续的定义中
         * 
         * 对于一个文件多个define的合并文件，如果其依赖的模块在后续有define
         * 当前模块应该不等待对后续依赖模块的define，自己先define
         * 原因：
         * 开发时或构建工具在文件合并时，会打断后分析模块对前分析模块的循环依赖
         * 构建结果文件中后分析模块的define代码会置于文件前部
         * 
         * 后来使用了新的机制监测依赖和进行模块定义，该逻辑被废除
         * 
         * @inner
         * @param {number} startIndex 开始索引
         * @param {string} dependId 模块id
         * @return {boolean} 
         */
        // function isInAfterDefine( startIndex, dependId ) {
        //     var len = defines.length;
        //     for ( ; startIndex < len; startIndex++ ) {
        //         var defineId = defines[ startIndex ].id;
        //         if ( dependId == ( defineId || currentId ) ) {
        //             return 1;
        //         }
        //     }

        //     return 0;
        // }
        
        /**
         * 预处理依赖，并进行define
         * 
         * @inner
         */
        function pretreatAndDefine() {
            each(
                defines,
                function ( defineItem, defineIndex ) {
                    var id = defineItem.id || currentId;
                    var depends = defineItem.deps;
                    var realDepends = defineItem.realDeps;
                    var hardDepends = [];
                    
                    // 对参数中声明的依赖进行normalize
                    // 并且处理参数中声明依赖的循环依赖
                    var len = depends.length;
                    while ( len-- ) {
                        var dependId = normalize( depends[ len ], id );
                        depends[ len ] = dependId;
                        if ( !isInDependencyChain( id, dependId ) ) {
                            hardDepends.unshift( dependId );
                        }
                    }

                    // 依赖模块id normalize化，并去除必要的依赖。去除的依赖模块有：
                    // 1. 内部模块：require/exports/module
                    // 2. 重复模块：dependencies参数和内部require可能重复
                    // 3. 空模块：dependencies中使用者可能写空
                    // 4. 在当前script中，被定义在后续代码中的模块
                    // 
                    // 后来使用了新的机制监测依赖和进行模块定义，4被废除
                    var len = realDepends.length;
                    var existsDepend = {};
                    var realRequireDepends = [];
                    
                    while ( len-- ) {
                        var dependId = normalize( realDepends[ len ], id );
                        if ( !dependId
                             || dependId in existsDepend
                             || dependId in BUILDIN_MODULE
                             //|| isInAfterDefine( defineIndex + 1, dependId )
                        ) {
                            realDepends.splice( len, 1 );
                        }
                        else {
                            existsDepend[ dependId ] = 1;
                            realDepends[ len ] = dependId;
                        }
                    }

                    // 将实际依赖压入加载序列中，后续统一进行require
                    requireModules.push.apply( requireModules, realDepends );
                    mod_define( 
                        id, defineItem.factory, 
                        depends, hardDepends, realDepends
                    );
                }
            );

            nativeRequire( requireModules );
        }
    }

    /**
     * 判断source是否处于target的依赖链中
     * 判断依据为直接声明的依赖，非内部require
     *
     * @inner
     * @return {boolean}
     */
    function isInDependencyChain( source, target ) {
        var module = mod_getModule( target );
        var depends = module && module.hardDeps;
        
        if ( depends ) {
            var len = depends.length;

            while ( len-- ) {
                var dependName = depends[ len ];
                if ( source == dependName
                     || isInDependencyChain( source, dependName ) 
                ) {
                    return 1;
                }
            }
        }

        return 0;
    }
    
    /**
     * 获取模块
     * 
     * @param {string|Array} ids 模块名称或模块名称列表
     * @param {Function=} callback 获取模块完成时的回调函数
     * @return {Object}
     */
    function nativeRequire( ids, callback, baseId ) {
        callback = callback || new Function();
        baseId = baseId || '';

        // 根据 https://github.com/amdjs/amdjs-api/wiki/require
        // It MUST throw an error if the module has not 
        // already been loaded and evaluated.
        if ( typeof ids == 'string' ) {
            if ( !mod_isInited( ids ) ) {
                throw new Error( '[MODULE_MISS]' + ids + ' is not exists!' );
            }

            return mod_getModuleExports( ids );
        }

        if ( !isArray( ids ) ) {
            return;
        }
        
        if ( ids.length === 0 ) {
            callback();
            return;
        }
        
        var isCallbackCalled = 0;
        mod_addInitedListener( tryFinishRequire );
        each(
            ids,
            function ( id ) {
                if ( id in BUILDIN_MODULE ) {
                    return;
                } 

                ( id.indexOf( '!' ) > 0 
                    ? loadResource
                    : loadModule
                )( id, baseId );
            }
        );

        tryFinishRequire();
        
        /**
         * 尝试完成require，调用callback
         * 在模块与其依赖模块都加载完时调用
         * 
         * @inner
         */
        function tryFinishRequire() {
            if ( isCallbackCalled ) {
                return;
            }

            var allDefined = 1;
            var visitedModule = {};

            /**
             * 判断是否所有模块都已经加载完成，包括其依赖的模块
             * 
             * @inner
             * @param {Array} modules 直接模块标识列表
             * @return {boolean}
             */
            function isAllInited( modules ) {
                var allInited = 1;
                each(
                    modules,
                    function ( id ) {
                        if ( visitedModule[ id ] ) {
                            return;
                        }
                        visitedModule[ id ] = 1;

                        if ( BUILDIN_MODULE[ id ] ) {
                            return;
                        }

                        if ( 
                            !mod_isInited( id ) 
                            || !isAllInited( mod_getModule( id ).deps )
                        ) {
                            allInited = 0;
                            return false;
                        }
                    }
                );

                return allInited;
            }

            // 检测并调用callback
            if ( isAllInited( ids ) ) {
                isCallbackCalled = 1;
                mod_removeInitedListener( tryFinishRequire );

                var args = [];
                each( 
                    ids,
                    function ( id ) {
                        args.push( 
                            BUILDIN_MODULE[ id ] 
                            || mod_getModuleExports( id ) 
                        );
                    }
                );

                callback.apply( global, args );
            }
        }
    }

    /**
     * 正在加载的模块列表
     * 
     * @inner
     * @type {Object}
     */
    var loadingModules = {};

    /**
     * 加载模块
     * 
     * @inner
     * @param {string} moduleId 模块标识
     */
    function loadModule( moduleId ) {
        if ( 
            mod_exists( moduleId )
            || loadingModules[ moduleId ]
        ) {
            return;
        }

        loadingModules[ moduleId ] = 1;

        // 创建script标签
        var script = document.createElement( 'script' );
        script.setAttribute( 'data-require-id', moduleId );
        script.src = toUrl( moduleId ) + '.js';
        script.async = true;
        if ( script.readyState ) {
            script.onreadystatechange = loadedListener;
        }
        else {
            script.onload = loadedListener;
        }
        // TODO: onerror
        appendScript( script );

        /**
         * script标签加载完成的事件处理函数
         * 
         * @inner
         */
        function loadedListener() {
            var readyState = script.readyState;
            if ( 
                typeof readyState == 'undefined'
                || /^(loaded|complete)$/.test( readyState )
            ) {
                script.onload = script.onreadystatechange = null;

                completeDefine( moduleId );
                delete loadingModules[ moduleId ];
                script = null;
            }
        }
    }

    /**
     * 加载资源
     * 
     * @inner
     * @param {string} pluginAndResource 插件与资源标识
     * @param {string} baseId 当前环境的模块标识
     */
    function loadResource( pluginAndResource, baseId ) {
        var idInfo = parseId( pluginAndResource );
        var pluginId = idInfo.module;
        var resourceId = idInfo.resource;

        function load( plugin ) {
            if ( !mod_isInited( pluginAndResource ) ) {
                plugin.load( 
                    resourceId, 
                    createLocalRequire( baseId ),
                    function ( value ) {
                        mod_addResource( pluginAndResource, value );
                    },
                    {}
                );
            }
        }

        if ( !mod_isInited( pluginId ) ) {
            nativeRequire( [ pluginId ], load ); 
        }
        else {
            load( mod_getModuleExports( pluginId ) );
        }
    }

    /**
     * require配置
     * 
     * @inner
     * @type {Object}
     */
    var requireConf = { 
        baseUrl  : './',
        paths    : {},
        config   : {},
        map      : {},
        packages : []
    };

    /**
     * 配置require
     * 
     * @param {Object} conf 配置对象
     */
    require.config = function ( conf ) {
        // 原先采用force和deep的mixin方案
        // 后来考虑到如果使用者将require.config写在多个地方
        // 打包分析需要考虑合并以及合并顺序问题，比较混乱
        // 又回归最简单的对象拷贝方案实现
        for ( var key in conf ) {
            if ( conf.hasOwnProperty( key ) ) {
                requireConf[ key ] = conf[ key ];
            }
        }
        
        createConfIndex();
    };

    // 初始化时需要创建配置索引
    createConfIndex();

    /**
     * 创建配置信息内部索引
     * 
     * @inner
     */
    function createConfIndex() {
        requireConf.baseUrl = requireConf.baseUrl.replace( /\/$/, '' ) + '/';
        createPathsIndex();
        createMappingIdIndex();
        createPackagesIndex();
    }

    /**
     * packages内部索引
     * 
     * @inner
     * @type {Array}
     */
    var packagesIndex;

    /**
     * 创建packages内部索引
     * 
     * @inner
     */
    function createPackagesIndex() {
        packagesIndex = [];
        each( 
            requireConf.packages,
            function ( packageConf, index ) {
                var pkg = packageConf;
                if ( typeof packageConf == 'string' ) {
                    pkg = {
                        name: packageConf.split('/')[ 0 ],
                        location: packageConf,
                        main: 'main'
                    };
                }
                
                pkg.location = pkg.location || pkg.name;
                pkg.main = (pkg.main || 'main').replace(/\.js$/i, '');
                packagesIndex.push( pkg );
            }
        );

        packagesIndex.sort( createDescSorter( 'name' ) );
    }

    /**
     * paths内部索引
     * 
     * @inner
     * @type {Array}
     */
    var pathsIndex;

    /**
     * 创建paths内部索引
     * 
     * @inner
     */
    function createPathsIndex() {
        pathsIndex = kv2List( requireConf.paths );
        pathsIndex.sort( createDescSorter() );
    }

    /**
     * mapping内部索引
     * 
     * @inner
     * @type {Array}
     */
    var mappingIdIndex;
    
    /**
     * 创建mapping内部索引
     * 
     * @inner
     */
    function createMappingIdIndex() {
        mappingIdIndex = [];
        
        mappingIdIndex = kv2List( requireConf.map );
        mappingIdIndex.sort( createDescSorter() );

        each(
            mappingIdIndex,
            function ( item ) {
                var key = item.k;
                item.v = kv2List( item.v );
                item.v.sort( createDescSorter() );
                item.reg = key == '*'
                    ? /^/
                    : createPrefixRegexp( key );
            }
        );
    }

    /**
     * 将模块标识转换成相对baseUrl的url
     * 
     * @inner
     * @param {string} id 模块标识
     * @return {string}
     */
    function toUrl( id ) {
        if ( !MODULE_ID_REG.test( id ) ) {
            return id;
        }

        var url = id;
        var isPathMap = 0;

        each( pathsIndex, function ( item ) {
            var key = item.k;
            if ( createPrefixRegexp( key ).test( url ) ) {
                url = url.replace( key, item.v );
                isPathMap = 1;
                return false;
            }
        } );

        if ( !isPathMap ) {
            each( 
                packagesIndex,
                function ( packageConf ) {
                    var name = packageConf.name;
                    if ( createPrefixRegexp( name ).test( id ) ) {
                        url = url.replace( name, packageConf.location );
                        return false;
                    }
                }
            );
        }

        if ( !/^([a-z]{2,10}:\/)?\//i.test( url ) ) {
            url = requireConf.baseUrl + url;
        }

        return url;
    }

    /**
     * 创建local require函数
     * 
     * @inner
     * @param {number} baseId 当前module id
     * @return {Function}
     */
    function createLocalRequire( baseId ) {
        function req( requireId, callback ) {
            if ( typeof requireId == 'string' ) {
                requireId = normalize( requireId, baseId );
                return nativeRequire( requireId, callback, baseId );
            }
            else if ( isArray( requireId ) ) {
                // 分析是否有resource使用的plugin没加载
                var unloadedPluginModules = [];
                each( 
                    requireId, 
                    function ( id ) { 
                        var idInfo = parseId( id );
                        var pluginId = normalize( idInfo.module, baseId );
                        if ( idInfo.resource && !mod_isInited( pluginId ) ) {
                            unloadedPluginModules.push( pluginId );
                        }
                    }
                );

                // 加载模块
                nativeRequire( 
                    unloadedPluginModules, 
                    function () {
                        var ids = [];
                        each( 
                            requireId, 
                            function ( id ) { 
                                ids.push( normalize( id, baseId ) ) 
                            } 
                        );
                        nativeRequire( ids, callback, baseId );
                    }, 
                    baseId
                );
            }
        }

        /**
         * 将[module ID] + '.extension'格式的字符串转换成url
         * 
         * @inner
         * @param {string} source 符合描述格式的源字符串
         * @return {string} 
         */
        req.toUrl = function ( id ) {
            return toUrl( normalize( id, baseId ) );
        };

        return req;
    }

    

    /**
     * id normalize化
     * 
     * @inner
     * @param {string} id 需要normalize的模块标识
     * @param {string} baseId 当前环境的模块标识
     * @return {string}
     */
    function normalize( id, baseId ) {
        if ( !id ) {
            return '';
        }

        var idInfo = parseId( id );
        if ( !idInfo ) {
            return id;
        }

        var resourceId = idInfo.resource;
        var moduleId = relative2absolute( idInfo.module, baseId );

        each(
            packagesIndex,
            function ( packageConf ) {
                var name = packageConf.name;
                var main = name + '/' + packageConf.main;
                if ( name == moduleId
                ) {
                    moduleId = moduleId.replace( name, main );
                    return false;
                }
            }
        );

        moduleId = mappingId( moduleId, baseId );
        
        if ( resourceId ) {
            var module = mod_getModuleExports( moduleId );
            resourceId = module.normalize
                ? module.normalize( 
                    resourceId, 
                    function ( resId ) {
                        return normalize( resId, baseId )
                    }
                  )
                : normalize( resourceId, baseId );
            
            return moduleId + '!' + resourceId;
        }
        
        return moduleId;
    }

    /**
     * 相对id转换成绝对id
     * 
     * @inner
     * @param {string} id 要转换的id
     * @param {string} baseId 当前所在环境id
     * @return {string}
     */
    function relative2absolute( id, baseId ) {
        if ( /^\.{1,2}/.test( id ) ) {
            var basePath = baseId.split( '/' );
            var namePath = id.split( '/' );
            var baseLen = basePath.length - 1;
            var nameLen = namePath.length;
            var cutBaseTerms = 0;
            var cutNameTerms = 0;

            pathLoop: for ( var i = 0; i < nameLen; i++ ) {
                var term = namePath[ i ];
                switch ( term ) {
                    case '..':
                        if ( cutBaseTerms < baseLen - 1 ) {
                            cutBaseTerms++;
                            cutNameTerms++;
                        }
                        else {
                            break pathLoop;
                        }
                        break;
                    case '.':
                        cutNameTerms++;
                        break;
                    default:
                        break pathLoop;
                }
            }

            basePath.length = baseLen - cutBaseTerms;
            namePath = namePath.slice( cutNameTerms );

            basePath.push.apply( basePath, namePath );
            return basePath.join( '/' );
        }

        return id;
    }

    /**
     * 模块id正则
     * 
     * @const
     * @inner
     * @type {RegExp}
     */
    var MODULE_ID_REG = /^([-_a-z0-9\.]+(\/[-_a-z0-9\.]+)*)(!.*)?$/i;

    /**
     * 解析id，返回带有module和resource属性的Object
     * 
     * @inner
     * @param {string} id 标识
     * @return {Object}
     */
    function parseId( id ) {
        if ( MODULE_ID_REG.test( id ) ) {
            var resourceId = RegExp.$3;

            return {
                module   : RegExp.$1,
                resource : resourceId ? resourceId.slice( 1 ) : ''
            };
        }

        return null;
    }

    /**
     * 基于map配置项的id映射
     * 
     * @inner
     * @param {string} id 模块id
     * @param {string} baseId 当前环境的模块id
     * @return {string}
     */
    function mappingId( id, baseId ) {
        each( 
            mappingIdIndex, 
            function ( item ) {
                if ( item.reg.test( baseId ) ) {

                    each( item.v, function ( mapData ) {
                        var key = mapData.k;
                        var rule = createPrefixRegexp( key );
                        
                        if ( rule.test( id ) ) {
                            id = id.replace( key, mapData.v );
                            return false;
                        }
                    } );

                    return false;
                }
            }
        );

        return id;
    }

    /**
     * 将对象数据转换成数组，数组每项是带有k和v的Object
     * 
     * @inner
     * @param {Object} source 对象数据
     * @return {Array.<Object>}
     */
    function kv2List( source ) {
        var list = [];
        for ( var key in source ) {
            if ( source.hasOwnProperty( key ) ) {
                list.push( {
                    k: key, 
                    v: source[ key ]
                } );
            }
        }

        return list;
    }

    // 感谢requirejs，通过currentlyAddingScript兼容老旧ie
    // 
    // For some cache cases in IE 6-8, the script executes before the end
    // of the appendChild execution, so to tie an anonymous define
    // call to the module name (which is stored on the node), hold on
    // to a reference to this node, but clear after the DOM insertion.
    var currentlyAddingScript;
    var interactiveScript;

    /**
     * 获取当前script标签
     * 用于ie下define未指定module id时获取id
     * 
     * @inner
     * @return {HTMLDocument}
     */
    function getCurrentScript() {
        if ( currentlyAddingScript ) {
            return currentlyAddingScript;
        }
        else if ( 
            interactiveScript 
            && interactiveScript.readyState == 'interactive'
        ) {
            return interactiveScript;
        }
        else {
            var scripts = document.getElementsByTagName( 'script' );
            var scriptLen = scripts.length;
            while ( scriptLen-- ) {
                var script = scripts[ scriptLen ];
                if ( script.readyState == 'interactive' ) {
                    interactiveScript = script;
                    return script;
                }
            }
        }
    }

    /**
     * 向页面中插入script标签
     * 
     * @inner
     * @param {HTMLScriptElement} script script标签
     */
    function appendScript( script ) {
        currentlyAddingScript = script;

        var doc = document;
        (doc.getElementsByTagName('head')[0] || doc.body).appendChild( script );
        
        currentlyAddingScript = null;
    }

    /**
     * 创建id前缀匹配的正则对象
     * 
     * @inner
     * @param {string} prefix id前缀
     * @return {RegExp}
     */
    function createPrefixRegexp( prefix ) {
        return new RegExp( '^' + prefix + '(/|$)' );
    }

    /**
     * 判断对象是否数组类型
     * 
     * @inner
     * @param {*} obj 要判断的对象
     * @return {boolean}
     */
    function isArray( obj ) {
        return obj instanceof Array;
    }

    /**
     * 循环遍历数组集合
     * 
     * @inner
     * @param {Array} source 数组源
     * @param {function(Array,Number):boolean} iterator 遍历函数
     */
    function each( source, iterator ) {
        if ( isArray( source ) ) {
            for ( var i = 0, len = source.length; i < len; i++ ) {
                if ( iterator( source[ i ], i ) === false ) {
                    break;
                }
            }
        }
    }

    /**
     * 创建数组字符数逆序排序函数
     * 
     * @inner
     * @param {string} property 数组项对象名
     * @return {Function}
     */
    function createDescSorter( property ) {
        property = property || 'k';

        return function ( a, b ) {
            var aValue = a[ property ];
            var bValue = b[ property ];

            if ( bValue == '*' ) {
                return -1;
            }

            if ( aValue == '*' ) {
                return 1;
            }

            return bValue.length - aValue.length;
        };
    }

    // 暴露全局对象
    global.define = define;
    global.require = require;
})( this );