//将默认配置和用户配置结合得方法
function combine(defaultConfig, userConfig) {
    Object.keys(userConfig).forEach((key) => {
        if (key === "requestHeaders") {
            //是对象合并赋值
            if (isPlainObject(userConfig[key])) {
                defaultConfig[key] = { ...defaultConfig[key], ...userConfig[key] };
            }
            //不是对象抛出错误
            else {
                throw new Error("requestHeaders应该为一个对象！！");
            }
        } else defaultConfig[key] = userConfig[key];
    });
    return defaultConfig;
}

//判断是否是一个确定的对象
function isPlainObject(data) {
    return Object.prototype.toString.call(data) === "[object Object]";
}

//将parmas参数转化为urlencoded形式
function transformParamsToString(parmas) {
    let stringParmas = "";
    //如果不是一个对象则返回
    if (!isPlainObject(parmas)) return;
    Object.keys(parmas).forEach((key) => {
        stringParmas = `${stringParmas}${key}=${parmas[key]}&`;
    });
    return stringParmas.substring(0, stringParmas.length - 1);
}

//将路径统一
function checkUrl(baseUrl, url, params) {
    //判断params是否存在
    if (arguments[2]) {
        //如果不存在"?"
        if (baseUrl.indexOf("?") === -1) {
            return baseUrl + url + "?" + transformParamsToString(params);
        }
        //存在"?"
        return (
            baseUrl.replace("?", "") + url + "?" + transformParamsToString(params)
        );
    }
    //不存在parmas参数
    else {
        //直接返回拼接的路径baseUrl:(http://localhost:3000),url:(/xxx/xxx)
        return baseUrl + url;
    }
}

//转换头信息为对象形式
function transformHeaders(headers) {
    //如果header不是字符串则返回
    if (typeof headers !== "string") return 0;
    const headersObj = {};
    //将header信息以\r\n分开
    const headersArr = headers.split("\r\n");
    //遍历拿到每一组key,value赋值到headersObj上
    headersArr.forEach((header) => {
        if (header.trim() === "" || header.indexOf(":") === -1) return;
        const headerArr = header.split(":");
        const key = headerArr[0];
        const value = headerArr[1];
        headersObj[key] = value;
    });
    return headersObj;
}

//设置默认配置
const defaultConfig = {
    method: "get",
    timeout: 0,
    url: "",
    baseUrl: "",
    parmas: {},
    data: {},
    requestHeaders: {},
};

//创建Axios构造函数
function Axios(config) {
    this.defaultConfig = config;
    this.interceptors = {
        request: new InterceptorManger(),
        response: new InterceptorManger(),
    };
}

//InterceptorManger构造函数
function InterceptorManger() {
    this.handlers = []
}

//给InterceptorManger原型添加方法
InterceptorManger.prototype.use = function (fulfilled, rejected) {
    this.handlers.push({
        fulfilled,
        rejected
    })
}



//给Axios添加request方法(重要)
Axios.prototype.request = function (userConfig) {
    //第一个参数是字符串默认为url
    if (typeof arguments[0] === "string") {
        const url = userConfig;
        userConfig = arguments[1] || {};
        userConfig.url = url;
    }
    //如果只有一个参数
    else {
        userConfig = userConfig || {};
    }

    //获取默认配置
    const defaultConfig = this.defaultConfig;
    //合并配置
    const combineConfig = combine(defaultConfig, userConfig);
    //将method得值转化为小写
    if (combineConfig.method) {
        combineConfig.method = combineConfig.method.toLowerCase();
    } else if (this.defaultConfig.method) {
        combineConfig.method = this.defaultConfig.method.toLowerCase();
    }
    //如果method不存在则默认为get请求方式
    else {
        combineConfig.method = "get";
    }

    //undefined用于站位
    const chain = [dispatchRequest, undefined];
    //创建成功得promise
    let promise = Promise.resolve(combineConfig);
    //将请求拦截器中的函数压入chain([f,f,f,f,dispatchRequest,undefind])
    this.interceptors.request.handlers.forEach(item => {
        chain.unshift(item.fulfilled, item.rejected)
    })
    //将响应拦截器中的函数压入chain([f,f,f,f,dispatchRequest,undefind,f,f,f,f])
    this.interceptors.response.handlers.forEach(item => {
        chain.push(item.fulfilled, item.rejected)
    })

    console.log(chain)
    while (chain.length > 0) {
        //创建得成功promise对象则一定会进入dispatchRequest
        promise = promise.then(chain.shift(), chain.shift());
    }
    //返回promise对象
    return promise;
};

//给axios添加get方法
Axios.prototype.get = function (userConfig) {
    if (arguments[1]) {
        const objConfig = arguments[1];
        objConfig.method = "GET";
        return this.request(userConfig, objConfig);
    }
    return this.request(userConfig, { method: "GET" });
};

//给axios添加post方法
Axios.prototype.post = function (userConfig) {
    if (arguments[1]) {
        const objConfig = arguments[1];
        objConfig.method = "GET";
        return this.request(userConfig, objConfig);
    }
    return this.request(userConfig, { method: "POST" });
};

//用于对返回的数据进行一些处理
function dispatchRequest(combineConfig) {
    //只写浏览器端的xhr请求,不做node端的http请求
    return xhrAdapter(combineConfig).then(
        function onAdapterResolution(response) {
            /*请求成功了*/
            //对数据进行转换
            response.data = JSON.parse(response.data);
            response.headers = transformHeaders(response.headers);
            return response;
        },
        function onAdapterRejection(error) {
            /*请求失败了*/
            throw new Error(error);
        }
    );
}

function xhrAdapter(combineConfig) {
    return new Promise(function dispatchXhrRequest(resolve, reject) {
        let errorMessage = [];
        //获取combieConfig中的数据
        const { url, baseUrl, method, timeout, params, requestHeaders } =
            combineConfig;
        let data = combineConfig.data;
        //创建XHLHttpRequest实例对象
        const xhr = new XMLHttpRequest();
        //处理baseUrl和url
        const requestUrl = checkUrl(baseUrl, url, params);
        //设置最大请求时长超过这个时长则自动取消请求
        xhr.timeout = timeout;
        //发送ajax请求
        xhr.open(method.toLowerCase(), requestUrl, true);
        //data不存在,发送的是get请求
        if (data === undefined) {
            data = null;
            delete combineConfig.requestHeaders["content-type"];
        }
        //存在data转化为json格式
        else {
            data = JSON.stringify(data);
        }
        //设置请求头
        for (let key in requestHeaders) {
            xhr.setRequestHeader(key, requestHeaders[key]);
        }
        //监听状态
        xhr.onreadystatechange = function () {
            //下载状态未完成(0,1,2,3)退出函数
            if (xhr.readyState !== 4 || !xhr) return;
            //如果状态码为200-300则请求成功
            if (xhr.status >= 200 && xhr.status < 300) {
                const responseHeaders = xhr.getAllResponseHeaders();
                //如果返回类型为文本则返回文本数据,否则直接返回数据
                const responseData =
                    xhr.responseType === "text" ? xhr.responseText : xhr.response;
                const response = {
                    data: responseData,
                    status: xhr.status,
                    statusText: xhr.statusText,
                    headers: responseHeaders,
                    config: combineConfig,
                    request: xhr,
                };
                resolve(response);
            }
            //请求失败
            else {
                /*       由于这里的错误信息会先执行后面的ontimeout错误信息
                         法抛出利用数组长度来做判断是否需要执行                    */
                if (errorMessage.length === 1) {
                    reject(errorMessage[0]);
                }
                //推入错误信息
                errorMessage.push(
                    `请求失败,状态码为${xhr.status}    ${xhr.statusText}`
                );
            }
        };
        //设置延迟函数
        xhr.ontimeout = function checkTimeout() {
            //超过了延迟时间抛出错误提示
            const timeoutErrorMessage = `请求时间超过了设置的timeout:${timeout}ms 取消请求！`;
            //占位
            errorMessage.push("");
            reject(timeoutErrorMessage);
        };
        //当执行xhr.abort()时执行的函数abort()用于让用户主动取消请求
        xhr.onabort = function checkAbort() {
            if (!xhr) return;
            const _errorMessage = `请求终止!!`;
            //占位
            errorMessage.push("");
            reject(_errorMessage);
        };
        //设置取消请求(如果cancelToken存在才执行)
        if (combineConfig.cancelToken) {
            //只要外部调用了cancel()函数则状态就会变为成功
            combineConfig.cancelToken.promise.then(() => {
                //终止请求
                xhr.abort();
            });
        }
        //发送响应体
        xhr.send(data);
    });
}

//实例化对象
function createInstance(config) {
    //实例化axios
    const context = new Axios(config);
    //创建函数
    const instance = Axios.prototype.request.bind(context);

    //将实例对象的属性赋值给instance
    Object.keys(context).forEach((key) => {
        instance[key] = context[key];
    });
    //给instance添加各种方法
    for (let key in Axios.prototype) {
        instance[key] = Axios.prototype[key];
    }
    //只用这个遍历也可以的 for in会遍历原型链中不可枚举属性(例如Object,Number等的原型)
    /*for(let key in context){
    console.log(key);
    instance[key] = context[key] 
}*/

    return instance;
}

//创建暴露给用户得axios实例对象
const axios = createInstance(defaultConfig);

//给axios实例添加create方法
axios.create = function (config) {
    return createInstance(combine(defaultConfig, config));
};
/*
示例代码(如何取消请求)
let cancel
{
cancelToken:new CancelToken(function(c){
    cancel = c
})
}
cancel() 
*/

/***************实现取消请求************** */

//请求取消构造函数
function CancelToken(executor) {
    //判断cancelToken的参数是否为一个对象,不为对象抛出错误！
    if (typeof executor !== "function") {
        throw new Error("new CancelToken的参数应该为一个函数！！");
    }
    //定义外部变量
    let resolvePromise;
    //给cancelToken实例对象添加promise对象,这里的this指向config.cancelToken属性的值
    this.promise = new Promise(function (resolve) {
        //将resolve交给外部变量,只要调用resolvePromise就可以改变promise状态
        resolvePromise = resolve;
    });
    //这里的function相当于c
    executor(function () {
        //这是的funcition相当于c也就是cancel调用cancel执行resolvePromise()改变promise状态为成功
        resolvePromise();
    });
}

/**************剩余部分的调用在xhrAdapter中******************** */


//test code

console.dir(axios.interceptors.request);
//设置请求拦截器
axios.interceptors.request.use(
    function config(config) {
        console.log("请求拦截器 成功1");
        return config;
    },
    function error(error) {
        console.log("请求拦截器 失败1");
        return Promise.reject(error);
    }
);

axios.interceptors.request.use(
    function config(config) {
        console.log("请求拦截器 成功2");
        return config;
    },
    function error(error) {
        console.log("请求拦截器 失败2");
        return Promise.reject(error);
    }
);

//设置响应拦截器
axios.interceptors.response.use(
    function config(response) {
        console.log("响应拦截器 成功1");
        return response;
    },
    function error(error) {
        console.log("响应拦截器 失败1");
        return Promise.reject(error);
    }
);

axios.interceptors.response.use(
    function (response) {
        console.log("响应拦截器 成功2");
        return response;
    },
    function (error) {
        console.log("响应拦截器 失败2");
        return Promise.reject(error);
    }
);

