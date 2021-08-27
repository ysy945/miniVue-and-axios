//判断传入 的是否为一个对象
const isObject = (data) => typeof data === "object" && data !== null
//判断传入的是否为一个数组
const isArray = (data) => Array.isArray(data)
//判断传入的是否为一个整数
const isInteger = (data) => parseInt(data) === data
//设置一个映射表用于验证这个数据是否被重复代理过
const isProxySameMap = new WeakMap()
//设置一个映射表用于验证这个数据是否已经被代理过
const hasProxyMap = new WeakMap()
//用于判断是否被代理过
const isProxy = (target) => hasProxyMap.get(target) !== undefined
//用于判断对象身上是否有某个属性
const hasOwn = (object, key) => Object.hasOwnProperty(object, key)
//用于映射target,key,effect关系
const targetMap = new WeakMap
//响应式api
function shallowReactive(normalObject) {
    return createReactiveObject(normalObject, true, false)
}
function readonly(normalObject) {
    return createReactiveObject(normalObject, false, true)
}
function shallowReadonly(normalObject) {
    return createReactiveObject(normalObject, true, true)
}
function reactive(normalObject) {
    return createReactiveObject(normalObject, false, false)
}

function createReactiveObject(normalObject, isShallow, isReadobly) {
    //判断传入的第一个参数是否为对象
    if (isObject(normalObject)) {
        //定义代理后的数据
        const proxy = reactiveObject(normalObject, isShallow, isReadobly)
        //创建代理时后将key:target,value:receiver放入映射表
        if (!isProxySameMap.get(normalObject) && normalObject !== proxy) {
            isProxySameMap.set(normalObject, proxy)
        }
        //创建代理时后将key:target,value:receiver放入映射表
        if (!hasProxyMap.get(normalObject)) {
            hasProxyMap.set(proxy, normalObject)
        }
        //返回代理后的对象
        return proxy
    } else {
        //如果传入的第一个参数不是一个对象,则不代理
        console.warn("参数需要为一个对象!!")
        return normalObject
    }

}

function reactiveObject(normalObject, isShallow, isReadonly) {
    //判断这是不是一个代理
    if (hasProxyMap.get(normalObject)) return normalObject
    //判断是否重复代理
    const target = isProxySameMap.get(normalObject)
    if (target) {
        return target
    }
    //普通的响应式对象
    if (!isShallow && !isReadonly) {
        return new Proxy(normalObject, reactiveHandlers)
    }
    //只做一层的响应式对象
    if (isShallow && !isReadonly) {
        return new Proxy(normalObject, shallowHandlers)
    }
    //仅读的响应式对象
    if (!isShallow && isReadonly) {
        return new Proxy(normalObject, readonlyHandlers)
    }
    //仅读且只代理第一层的(第二层不可改且不被代理)响应式对象
    return new Proxy(normalObject, shallowReadonlyHandlers)
}

//创建对应的处理方法
const reactiveHandlers = {
    get: createProxyGetter(false, false),
    set: createProxySetter(false, false),
    deleteProperty: createProxyDelete(false,false)
}
const shallowHandlers = {
    get: createProxyGetter(true, false),
    set: createProxySetter(true, false),
    deleteProperty: createProxyDelete(true,false)
}
const readonlyHandlers = {
    get: createProxyGetter(false, true),
    set: createProxySetter(false, true),
    deleteProperty: createProxyDelete(false,true)
}
const shallowReadonlyHandlers = {
    get: createProxyGetter(true, true),
    set: createProxySetter(true, true),
    deleteProperty: createProxyDelete(true,true)
}

//创建代理getter
function createProxyGetter(isShallow, isReadonly) {
    return function (target, key, receiver) {
        if(key === "__v_isReactive")return true
        else if(key === "__v_isShallow"){
            return shallow
        }
        else if(key ==="__v_isReadonly"){
            return isReadonly
        }
        //如果这个响应式数据不是一个只读的则收集依赖
        if (!isReadonly) {
            //收集依赖
            track(target, key)
        }
        //如果这是一个浅的响应式
        if (isShallow) {
            //返回想要获取的值
            return Reflect.get(target, key, receiver)
        } else {//递归的响应式
            //获取当前获得的值
            const target_key = Reflect.get(target, key, receiver)
            /*判断当前获得的值是否为对象,如果还是对象递归调用reactive创建响应式对象
            如果不是对象直接返回获取的值即可*/
            if (isObject(target_key)) {//是对象则是深层的递归调用
                //判断是否为只读的若为只读的调用readonly的递归,否则调用reactive的递归
                return isReadonly ? readonly(target_key) : reactive(target_key)
            } else {//不是对象即只有一层,返回当前的值即可
                return target_key
            }
        }
    }
}

//创建代理setter
function createProxySetter(isShalllow, isReadonly) {
    return function (target, key, value, receiver) {
        //判断是否为新增数据
        const isChange = key in target
        //保存旧的值
        const preValue = target[key]
        //修改新的值返回是否成功
        const result = Reflect.set(target, key, value, receiver)
        //如果这是一个只读的响应式,则不需要setter,向用户抛出警告
        if (isReadonly) {
            //提醒用户告诉用户这是一个只读的响应式
            console.warn("设置失败,这是一个只读的响应式数据！！")
            return false
        } else {//不是只读的
            //定义旧的值
            if (!isChange) {//新增的值
                trigger(target, key, "add", value, preValue)
            }
            else {//修改值
                trigger(target, key, "modify", value, preValue)
            }
            document.getElementsByTagName("body")[0].innerHTML=""
            patch(document.getElementsByTagName("body")[0].appendChild(createElement("div")),Vnode1)
            return result
        }
    }
}

//创建代理delete
function createProxyDelete(isShalllow,isReadonly){
    return function(target,key){
        console.log(target,key);
    }
}

//监视函数
function watchEffect(fn, options) {
    //让effect变为响应式的可以当数据变化时调用fn
    const effect = createReactiveEffect(fn, options = {})
    //如果配置选项中有lazy为false或没有配置lazy选项则不自动effect
    if (!options.lazy || !hasOwn(options, "lazy")) {
        effect(fn, options)
    }
    //如果配置项lazy:true则不自己调用返回effect给用户让用户自己调用
    return effect
}

//给effect添加唯一标识
let _uid = 0
//用于存放当前effect
let currentEffect
//创建一个effect栈
let effectStack = []

function createReactiveEffect(fn, options) {
    const effect = function reactiveEffect() {
        //防止用户在effect中修改变量重复调用
        if (!effectStack.includes(effect)) {
            //用户执行的fn可能会报错,导致无法让effect出栈使用try finally
            try {
                //将effect推入栈中
                effectStack.push(effect)
                currentEffect = effect
                //默认fn需要先执行一次,执行fn后会读取fn中的变量进而进入get区域在放入依赖
                fn()
            } finally {
                //将effect推出栈中
                effectStack.pop(effect)
                //让当前的effect永远为栈中的最后一个effect
                currentEffect = effectStack[effectStack.length - 1]
            }
        }

    }
    effect._uid = _uid++//添加唯一标识
    effect._raw = fn//原函数          
    effect._options = options//添加配置项          
    effect._isEffect = true //判断当前是否为effect
    return effect
}

//收集依赖函数track,将effect与检测数据产生关联
function track(target, key) {
    //如果当前effect为空则没有使用watchEffect不收集依赖
    if (effectStack.length === 0) {
        return
    } else {
        let keyMap = targetMap.get(target)
        if (!keyMap) {
            targetMap.set(target, (keyMap = new Map))
        }
        let deps = keyMap.get(key)
        if (!deps) {
            keyMap.set(key, (deps = new Set))
        }
        if (!deps.has(currentEffect)) {
            deps.add(currentEffect)
        }
    }
}

//创建修改后调用effect的函数
function trigger(target, key, type=undefined, newValue=undefined, preValue=undefined) {
    //如果是修改的情况
    if (type === "modify") {
        const deps = targetMap.get(target)?.get(key)

        if (deps) {
            new Set([...deps]).forEach((effect) => {
                effect()
            })
        }
    }
}

function shallowRef(target){
    return createRef(target,true)
}

function ref(target){
    return createRef(target,false)
}

function createRef(target,isShalllow){
     return new RefImpl(target,isShalllow)
}

class RefImpl{
    constructor(rawValue,isShalllow){
       this.__v_isRef = true
       this._rawValue = rawValue
       this._shallow = isShalllow
       const _rawValue = isObject(rawValue)?reactive(rawValue):rawValue
       this._value = isShalllow?rawValue:_rawValue
    }
    //类得属性访问器
    get value(){
        //收集依赖
        track(this,"value")
        //返回访问得值
        return this._value
    }
    set value(newValue){
        //如果新的值与旧的值不一样
        if(this._rawValue !== newValue){
            //新得值替换新得值
            this._rawValue = newValue
            //替换的新的值需要判断是不是对象,如果是对象那么创建响应式对象否则返回本身
            const _newValue = isObject(newValue)?reactive(newValue):newValue
            //新的值是不是浅的如果是不做响应式返回本身
            this._value = this._shalllow?rawValue:_newValue
            trigger(this,"value","modify")
        }
    }
}
