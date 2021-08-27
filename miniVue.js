//设置一个在老的Vnode中的索引缓存
let keyMap = null

//用于传递Vnode
const VueObject = {}

VueObject.v_for_childNodeCollection = []

//精确判断是否为字符串
const isString = (data) => typeof data === "string"

//精确判断是否为数组
const isArray = (data) => Array.isArray(data)

//判断传入 的是否为一个对象
const isObject = (data) => typeof data === "object" && data !== null

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

//精确判断是否为对象
const isExactObject = (data) => {
    if (data) {
        if (data instanceof Object && data.constructor === Object) return true
        else return false
    }
}

//判断对象是否为空
function isObjEmpty(obj) {
    return Object.keys(obj).length === 0
}

//判断是否是h函数
const isH = (data) => {
    //如果data存在
    if (data) {
        return data.sel ? true : false
    }
}

//精确判断是否是一个函数
isExactFunction = (data) => {
    if (data) {
        if (data instanceof Function && data.constructor === Function) return true
        else return false
    }
}

//将类数组转为真正的数组
function toRealArray(arrayLike) {
    return Array.prototype.slice.call(arrayLike)
}

/************************************下面是diff代码************************************************* */

//设置dom节点属性的函数
function setAttribute(node, attribute, value) {
    return node.setAttribute(attribute, value)
}

//移除节点属性
function removeAttribute(node, attribute) {
    return node.removeAttribute(attribute)
}

//创建一个真实dom
function createElement(type) {
    return document.createElement(type)
}

//生成虚拟dom
function Vnode(sel, data = {}, text, children, elm) {
    const key = data.key
    //如果children是一个对象则封装成一个数组
    if (isExactObject(children)) children = [children]

    return {
        sel,
        data,
        text,
        children,
        elm,
        key
    }
}

//用于映射target,key,effect关系
const targetMap = new WeakMap

//h函数用于生成复杂的虚拟dom节点
function h(sel, data, children, elm = undefined) {

    //判断第一个参数是否为字符串
    if (!isString(sel)) throw new Error("第一个参数为字符串")
    //判断第二个参数是否为对象
    if (!(data instanceof Object)) throw new Error("第二个参数应该为对象")
    //判断第三个参数是否为字符串或数组
    if (!isString(children) && !(isArray(children)) && !isH(children)) throw new Error("第三个参数应该为一个数组或字符串或h函数")

    /*********************************传入参数正确************************************** */

    //如果第三个参数为字符串
    if (isString(children)) {
        return Vnode(sel, data, children, undefined, elm)
    }
    //如果第三个参数为数组
    if (isArray(children)) {
        children.forEach((childObj, index) => {
            if (!childObj.sel) {
                throw new Error(`h函数第三个参数中对象不正确,他在数组中的位置是${index}`)
            }
        })
        return Vnode(sel, data, undefined, children, elm)
    }
    //如果第三个参数为h函数
    if (children.sel && children instanceof Object) {
        return Vnode(sel, data, undefined, children, elm)
    }
}

/*h函数可以第一个参数传入标签类型"div"等等,第二个参数为数据{},第三个数据可以传入字符串,h函数本身,数组(包含的h数组) */

//将Vnode转化为Rdom
function createRealDom(Vnode) {
    //获取Vnode上的所有属性
    const { sel, data, text, children } = Vnode
    const node = createElement(sel)
    //如果text存在则放到Rdom上
    if (text) node.innerText = text
    //如果不存在则children一定存在(没有写文字和children同时存在的情况)
    else {
        //如果数组中有数据
        if (children) {
            //递归创建dom节点插入父节点
            children.forEach((vnodeObj) => {
                let childNode = createRealDom(vnodeObj)
                //讲创建的子节点插入父节点
                node.appendChild(childNode)
            })
        }
    }
    //将data中的数据做渲染
    renderData(node, data)
    Vnode.elm = node
    return node
}

//做dom属性的深度比较并且更新
function deepUpdate(oldVnode, newVnode) {
    const { data: { props: oldProps } } = oldVnode
    const { data: newData, data: { props: newProps } } = newVnode
    //如果旧的props不存在直接渲染新的props
    if (!oldProps) {
        renderData(oldVnode.elm, newData)
    }
    //如果旧的props和新的props都存在需要深度比较在进行更新
    if (oldProps && newProps) {
        //定义一个缓存对象用于存放属性
        const cacheObj = { ...newProps }
        for (let attribute in oldProps) {
            oldValue = oldProps[attribute]
            newValue = newProps[attribute]
            //如果旧的属性是字符串类型
            if (isString(oldValue)) {
                //如果新的属性也存在则判断与旧的是否相同,相同则不动,不相同更新,不存在则删除
                if (newValue && !isArray(newValue)) {
                    
                    if (oldValue !== newValue) setAttribute(oldVnode.elm, attribute, newValue)
                    
                }
                else if (isArray(newValue)) {
                    removeAttribute(oldVnode.elm, "class")
                    newValue.forEach((value) => {
                        oldVnode.elm.classList.add(value)
                    })
                }
                //不存在新的属性
                else removeAttribute(oldVnode.elm, attribute)
                delete cacheObj[attribute]
            }

            //如果属性是对象或则数组类型
            if (isExactObject(oldValue)) {
                if (isExactObject(newValue)) {
                    const cacheStyleObj = { ...newValue }
                    for (let key in oldValue) {
                        //如果新属性和原来的属性不同更新
                        if (oldValue[key] !== newValue[key]) {
                            oldVnode.elm.style[key] = newValue[key]
                        }
                        //如果新属性不存在则删除
                        if (!newValue[key]) oldVnode.elm.style[key] = ""
                        delete cacheStyleObj[key]
                    }
                    for (let key in cacheStyleObj) oldVnode.elm.style[key] = cacheStyleObj[key]
                } else {
                    removeAttribute(oldVnode.elm, "style")
                }
            }

            //如果传入的值是数组
            if (isArray(oldValue)) {
                removeAttribute(oldVnode.elm, "class")
                if (isArray(newValue)) {
                    oldVnode.elm.classList.add(newValue.join(" "))
                }
                else if (isString(newValue)) {
                    oldVnode.elm.classList.add(newValue)
                }
                delete cacheObj[attribute]
            }

            //如果是绑定函数事件
            if (isExactFunction(oldValue)) {
                const _attribute = attribute.toLowerCase()
                //如果新值不存在则删除节点的绑定事件
                if (!newValue) oldVnode.elm[_attribute] = function () { }
                //如果之前的函数与现在的函数不是同一个函数就覆盖之前的

                else if (newValue !== oldValue) {
                    oldVnode.elm[_attribute] = newValue


                }
            }

            //如果属性是value直接更改不使用attribute
            if (attribute === "value") {
                oldVnode.elm.value = newValue
            }

            delete cacheObj[attribute]
        }
        renderData(oldVnode.elm, { props: cacheObj })
    }
}

//渲染dom属性
function renderData(renderNode, data) {
    for (let key in data) {
        if (key === "props") {
            const { props } = data
            //循环遍历所有的属性
            for (let attribute in props) {
                //如果属性是以on开头的则是在绑定函数
                if (attribute.slice(0, 2) === "on") {
                    if (!isExactFunction(props[attribute])) throw new Error(`${attribute}应该为一个函数！`)
                    const fun = props[attribute]
                    const wayString = attribute.toLowerCase()
                    //判断是否为一个函数
                    if (isExactFunction(fun)) {
                        //绑定事件
                        renderNode[wayString] = fun
                    }
                    //如果不是一个函数
                    else {
                        throw new Error(`绑定的事件不是一个函数,这个事件是on${wayString}`)
                    }
                }
                //如果属性是类名
                else if (attribute === "class") {
                    const classValue = props[attribute]
                    //当value为数组的时候设置class名字
                    function valueIsArrToSetAtt() {
                        classValue.forEach((className) => {
                            renderNode.classList.add(className)
                        })
                    }
                    //判断类名是数组还是字符串,是字符串直接添加,不是字符串遍历添加
                    isString(classValue) ? setAttribute(renderNode, "class", classValue) : valueIsArrToSetAtt()
                }
                //如果属性是style
                else if (attribute === "style") {
                    const styleValue = props[attribute]
                    //如果style为对象
                    if (isExactObject(styleValue)) {
                        Object.keys(styleValue).forEach((key) => {
                            renderNode.style[key] = styleValue[key]
                        })
                    }
                    //如果是字符串
                    else if (isString(styleValue)) {
                        renderNode.style.cssText = styleValue
                    }
                    //如果都不是
                    else {
                        throw new Error("style属性的值应该为对象或字符串!!")
                    }
                }
                else setAttribute(renderNode, attribute, props[attribute])
            }

        }
    }
}

//将Vnode渲染成为真实dom
function patch(oldVnode, newVnode) {

    //传入的oldVnode是一个真实dom
    if (oldVnode.sel === undefined) {
        //将真实dom包装成为Vnode
        const { nodeName } = oldVnode
        const sel = nodeName.toLowerCase()
        oldVnode = Vnode(sel, {}, undefined, undefined, oldVnode)
    }


    //如果新的虚拟dom与旧的虚拟dom是同一个对象直接返回不做任何更新
    if (oldVnode === newVnode) {
        newVnode.elm = oldVnode.elm
        //删除oldVnode
        delete oldVnode
        return
    }

    //如果是同一个节点做进一步比较
    else if (oldVnode.sel === newVnode.sel && oldVnode.key === newVnode.key) {

        //对props里面的属性进行深度比较,有不同就更新,有新的就删除旧的 
        deepUpdate(oldVnode, newVnode)
        const { text: oldText, children: oldChildren, elm } = oldVnode
        const { text: newText, children: newChildren } = newVnode
        //如果新旧的text都存在且他们不相等
        if (oldText && newText && oldText !== newText) elm.innerText = newText
        //如果旧的是text存在,新的是存在的数组
        else if (oldText && newChildren && !newText) {
            //将文本设置为空
            elm.innerText = ""
            //更新新的children
            newVnode.children.forEach((node) => {
                elm.appendChild(createRealDom(node))
            })

        }
        //如果旧的是有children属性但是新的是文本且不存在children属性
        else if (oldChildren && newText && !newChildren) {
            //删除旧的所有节点的子节点,并设置文本
            elm.innerHTML = ""
            elm.innerText = newText
        }
        //如果新旧Vnode的children属性都是数组进行diff算法比较
        else if (oldChildren && newChildren) {
            const parentNode = oldVnode.elm
            //定义旧前的指针
            let oldStartIdx = 0
            //定义旧后的指针
            let oldEndIdx = oldChildren.length - 1
            //定义新前的指针
            let newStartIdx = 0
            //定义新后的指针
            let newEndIdx = newChildren.length - 1
            //定义旧前的Vnode
            let oldStartVnode = oldChildren[oldStartIdx]
            //定义旧后的Vnode
            let oldEndVnode = oldChildren[oldEndIdx]
            //定义新前的Vnode
            let newStartVnode = newChildren[newStartIdx]
            //定义新后的Vnode
            let newEndVnode = newChildren[newEndIdx]

            while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
                //判断当前指针是否为undefined如果是向前移动
                if (oldStartVnode === null || oldChildren[oldStartIdx] === undefined) {
                    oldStartVnode = oldChildren[++oldStartIdx]
                }

                else if (oldEndVnode === null || oldChildren[oldEndIdx] === undefined) {
                    oldEndVnode = oldChildren[--oldEndIdx]
                }

                //如果旧前与新前是同一个节点将指针向下移动
                if (oldStartVnode.key === newStartVnode.key && oldStartVnode.sel === newStartVnode.sel) {
                    patch(oldStartVnode, newStartVnode)
                    oldStartVnode = oldChildren[++oldStartIdx]
                    newStartVnode = newChildren[++newStartIdx]
                }

                //如果旧后与新后是同一个节点指针向上移动
                else if (oldEndVnode.key === newEndVnode.key && oldEndVnode.sel === newEndVnode.sel) {
                    patch(oldEndVnode, newEndVnode)
                    oldEndVnode = oldChildren[--oldEndIdx]
                    newEndVnode = newChildren[--newEndIdx]
                }

                else if (oldStartVnode.key === newEndVnode.key && oldStartVnode.sel === newEndVnode.sel) {
                    patch(oldStartVnode, newEndVnode)
                    //将旧前命中的节点插入到旧后的后面
                    parentNode.insertBefore(oldStartVnode.elm, oldEndVnode.elm.nextSibling)
                    oldStartVnode = oldChildren[++oldStartIdx]
                    newEndVnode = newChildren[--newEndIdx]
                }

                else if (oldEndVnode.key === newStartVnode.key && oldEndVnode.sel === newStartVnode.sel) {
                    patch(oldEndVnode, newStartVnode)
                    //将旧后插入到旧前的前面
                    parentNode.insertBefore(oldEndVnode.elm, oldStartVnode.elm)
                    oldEndVnode = oldChildren[--oldEndIdx]
                    newStartVnode = newChildren[++newStartIdx]
                }
                //如果不是上面四种情况需要重新遍历
                else {
                    keyMap = {}
                    for (let i = 0, j = oldChildren.length; i < j; i++) {
                        if (oldChildren[i] === undefined) continue
                        keyMap[oldChildren[i].key] = i
                    }
                    const idxInOld = keyMap[newStartVnode.key]
                    //如果找不到,则在旧Vnode中没有,需要新增
                    if (idxInOld === undefined) {
                        //创建需要插入的真实dom
                        const dom = createRealDom(newStartVnode)
                        // console.log(dom, oldStartVnode.elm);
                        parentNode.insertBefore(dom, oldStartVnode.elm)
                    }
                    //如果找到则需要移动
                    else {
                        const needToMove = oldChildren[idxInOld]
                        patch(needToMove, newStartVnode)
                        parentNode.insertBefore(needToMove.elm, oldStartVnode.elm)
                        //将移动的哪一项标记为undefined
                        oldChildren[idxInOld] = undefined
                    }
                    //将新前的指针向前移动
                    newStartVnode = newChildren[++newStartIdx]

                }
            }

            //循环结束后如果新前在新后的前面则需要插入新的
            if (newStartIdx <= newEndIdx) {
                for (let i = newStartIdx, j = newEndIdx; i <= j; i++) {
                    const dom = createRealDom(newChildren[i])
                    const before = newChildren[newEndIdx + 1] === undefined ? null : newChildren[newEndIdx + 1].elm
                    parentNode.insertBefore(dom, before)
                }
            }

            //循环结束后如果旧前还在旧后的前面则需要删除节点
            else if (oldStartIdx <= oldEndIdx) {
                for (let i = oldStartIdx, j = oldEndIdx; i <= j; i++) {
                    if (oldChildren[i] === undefined) continue
                    parentNode.removeChild(oldChildren[i].elm)
                }
            }
        }
    }

    //判断是否为同一个节点(不是同一个节点暴力拆除旧的变为新的)
    else {
        //获得新旧dom
        const newDom = createRealDom(newVnode)
        const { elm: oldDom } = oldVnode
        //将新dom插入到旧节点之前
        oldDom.parentNode.insertBefore(newDom, oldVnode.elm)
        //删除旧节点
        oldDom.parentNode.removeChild(oldDom)
        //将创建的新dom赋值给newVnode.elm以便于下次对比使用
        newVnode.elm = newDom
        return
    }
    //节点完全更新后将oldVnode的真实dom赋值给newVnode
    newVnode.elm = oldVnode.elm
}

/**************************************下面是响应式代码********************************************** */


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
    deleteProperty: createProxyDelete(false, false)
}
const shallowHandlers = {
    get: createProxyGetter(true, false),
    set: createProxySetter(true, false),
    deleteProperty: createProxyDelete(true, false)
}
const readonlyHandlers = {
    get: createProxyGetter(false, true),
    set: createProxySetter(false, true),
    deleteProperty: createProxyDelete(false, true)
}
const shallowReadonlyHandlers = {
    get: createProxyGetter(true, true),
    set: createProxySetter(true, true),
    deleteProperty: createProxyDelete(true, true)
}

//创建代理getter
function createProxyGetter(isShallow, isReadonly) {
    return function (target, key, receiver) {
        if (key === "__v_isReactive") return true
        else if (key === "__v_isShallow") {
            return shallow
        }
        else if (key === "__v_isReadonly") {
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
            if (VueObject.root) {
                //如果这不是一个对象
                if (!isExactObject(VueObject.variabilityObj[key])) {
                    //将修改的值赋值给用户返回的需要用变量的相应值中
                    VueObject.variabilityObj[key] = target[key]
                }
                //重新解析模板创建新的虚拟dom
                const newVnode = createVnode(VueObject.root, VueObject.variabilityObj)
                //最小化更新dom
                if (VueObject.beforeUpdate !== undefined) VueObject.beforeUpdate()
                patch(VueObject.oldVnode, newVnode)
                if (VueObject.updated !== undefined) VueObject.updated()

                //把新的Vnode赋值到Vue对象变为旧Vnode
                VueObject.oldVnode = newVnode
            }
            return result
        }
    }
}

//创建代理delete
function createProxyDelete(isShalllow, isReadonly) {
    return function (target, key) {
        console.log(target, key);
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
function trigger(target, key, type = undefined, newValue = undefined, preValue = undefined) {
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

function shallowRef(target) {
    return createRef(target, true)
}

function ref(target) {
    return createRef(target, false)
}

function createRef(target, isShalllow) {
    return new RefImpl(target, isShalllow)
}

class RefImpl {
    constructor(rawValue, isShalllow) {
        this.__v_isRef = true
        this._rawValue = rawValue
        this._shallow = isShalllow
        const _rawValue = isObject(rawValue) ? reactive(rawValue) : rawValue
        this._value = isShalllow ? rawValue : _rawValue
    }
    //类得属性访问器
    get value() {
        //收集依赖
        track(this, "value")
        //返回访问得值
        return this._value
    }
    set value(newValue) {
        //如果新的值与旧的值不一样
        if (this._rawValue !== newValue) {
            //新得值替换新得值
            this._rawValue = newValue
            //替换的新的值需要判断是不是对象,如果是对象那么创建响应式对象否则返回本身
            const _newValue = isObject(newValue) ? reactive(newValue) : newValue
            //新的值是不是浅的如果是不做响应式返回本身
            this._value = this._shalllow ? rawValue : _newValue
            trigger(this, "value", "modify")
        }
    }
}


//将dom转化为Vnode
function createVnode(node, variabilityObj = {}, v_forObj=undefined,index=undefined) {
    
    let children = []
    const sel = node.nodeName.toLowerCase()
    const data = {
        key: "",
        props: {}
    }
    //如果v_forObj存在表明这是一个v-for指令创建的虚拟dom
    if (v_forObj) {
        //p in xxx中的p作为索引,吧每次遍历的数据v_forObj传入
        variabilityObj[index] = v_forObj
        //如果在遍历的时候找不到key让用户输入
        if(!variabilityObj[index].key){
            throw new Error("请传入不同的key")
        }
        //将用户输入的key放到data.key上
        data.key = variabilityObj[index].key
    }
    toRealArray(node.attributes).forEach(attr => {
        const { name, value } = attr
        //如果第一个就找到&了,表明要写变量
        if (name.indexOf("&") === 0) {
            data.props[name.slice(1)] = getVariability(value, variabilityObj, name)
        }
        //如果是以@开头的,表明为函数
        else if (name.indexOf("@") === 0) {
            data.props["on" + name.slice(1)] = getVariability(value, variabilityObj, name)
        }
        //如果是v-double指令
        else if (name === "v-double") {
            data.props.value = getVariability(value, variabilityObj, name)
            data.props.oninput = function (e) {
                const keyArr = value.split(".")
                let a
                for (let i = 0, j = keyArr.length; i < j; i++) {
                    if (typeof variabilityObj[keyArr[i]] === "string") {
                        variabilityObj[keyArr[i]] = e.target.value
                    }
                    a = variabilityObj[keyArr[i]]
                    keyArr.shift()
                    if (isExactObject(a)) {
                        a[keyArr[0]] = e.target.value
                    }
                }
            }
        }
        else if (name === "v-show") {
            const style = data.props
            data.props.style = isExactObject(style) ? style : {}
            data.props.style.display = getVariability(value, variabilityObj, name) ? "block" : "none"
        }
        //<div v-for="p in person" &key=""></div>
        else if (name === "v-for") {
           
            const keyArr = value.split(" ")
            const result = getVariability(keyArr[2], variabilityObj, name)
            // node.removeAttribute("v-for")
            // const data = []
            //克隆一个节点
            const cloneNode = node.cloneNode(true)
            //将克隆节点的v-for属性删除
            cloneNode.removeAttribute("v-for")
            //对数据进行遍历
            result.forEach((resultOne) => {
                // data.push(createVnode(node, variabilityObj, resultOne,keyArr[0]))
                VueObject.v_for_childNodeCollection.push(createVnode(cloneNode, variabilityObj, resultOne,keyArr[0]))
            })
            // VueObject.v_for_childNodeCollection.push(data)
            VueObject.childNode = node
            
        }
        //如果没有特殊符号正常处理
        else data.props[name] = value
    })
    //如果子节点不为空则递归创建"
    if (node.childNodes.length > 0) {
        toRealArray(node.childNodes).forEach((childNode) => {
            //如果为eLement节点
            if (childNode.nodeType === 1) {
                children.push(createVnode(childNode, variabilityObj,v_forObj,index))
            }

        })
    }
    //用于v-for
    if (VueObject.childNode?.parentNode === node) {
        //让children属性为for循环中的数据
        children = VueObject.v_for_childNodeCollection
        //初始化
        VueObject.v_for_childNodeCollection = []
        VueObject.childNode=null
    }
    //如果没有子节点则只有文本节点赋值
    if (!node.firstElementChild) {
        const { innerText } = node
        children = ""
        //用户在写入变量
        let index = 0
        const varIndexArray = []
        while (index <= innerText.length) {
            if (innerText[index] === "{" || innerText[index] === "}") varIndexArray.push(index)
            index++
        }
        //使用了插值语法进一步解析字符串
        for (let i = 0, j = varIndexArray.length; i < j; i++) {
            if (i % 2) continue
            let beforeString = ""
            if (i === 0) {
                //获得不是变量的字符串
                beforeString = innerText.substring(0, varIndexArray[i])
            }
            else {
                //获得不是变量的字符串
                beforeString = innerText.substring(varIndexArray[i - 1] + 1, varIndexArray[i])
            }
            //拿到花括号中间的字符串
            let key = innerText.substring(varIndexArray[i] + 1, varIndexArray[i + 1])
            //将当前索引交给全局对象Vue
            // VueObject.key = key
            //对所有的字符串进行拼接
            children = children + beforeString + getVariability(key, variabilityObj)
        }
        //没有使用插值语法
        if (varIndexArray.length === 0) {
            children = innerText
        }
    }
    return h(sel, data, children, node)
}

function miniVue(opsObj) {
    const variabilityObj = opsObj.setup()
    const { beforeCreated, created, beforeMount, mounted, beforeUpdate, updated } = opsObj
    VueObject.variabilityObj = variabilityObj
    //如果setup返回值不是一个对象
    if (!isExactObject(variabilityObj)) {
        throw new Error("setup需要返回一个对象")
    }

    function $mount(node) {
        //如果beforeCreated钩子存在就调用它
        if (beforeCreated !== undefined) beforeCreated()
        const initVnode = createVnode(node, variabilityObj)
        //如果created钩子存在就调用它
        if (created !== undefined) created()
        //如果beforeMount钩子存在就调用它
        if (beforeMount !== undefined) beforeMount()
        patch(node, initVnode)
        //如果mounted钩子存在就调用它
        if (mounted !== undefined) mounted()
        //将用户传入的钩子函数放到VueObject中
        VueObject.beforeUpdate = beforeUpdate
        VueObject.updated = updated
        //将根节点放入VueObject
        VueObject.root = node
        //将初始虚拟dom作为VueObject的老节点便于后续比较
        VueObject.oldVnode = initVnode
    }
    return {
        $mount
    }
}

//递归获得最终的值(第一个参数为数组,里面存的键值,右边为对象,获得最终的value)
function getValue(Arr, Obj) {
    if (Arr.length === 0) {
        if (isExactObject(Obj)) return JSON.parse(JSON.stringify(Obj))
        return Obj
    }
    else {
        //如果找不到相应的键值抛出错误
        if (!Obj[Arr[0]] && Obj[Arr[0]] !== "") throw new Error(`不能再“${Obj}”上找到${[Arr[0]]}`)
        Obj = Obj[Arr[0]]
        Arr.shift()
        return getValue(Arr, Obj)
    }
}

//获得变量(以key(a.b.c或a)为键值获得obj对象中的值)
function getVariability(key, Obj, name = undefined) {
    const keyArr = key.split(".")
    //如果value是a.b.c这种类型
    if (keyArr.length !== 1 && key !== "") {
        return getValue(keyArr, Obj)
    }
    //value是单一变量类型
    else {
        if (!key) {
            if (name === undefined) throw new Error(`表达式不能为空`)
            throw new Error(`${name}不能为空`)
        }
        if (!Obj[key] && Obj[key] !== "" && Obj[key] !== false) {
            console.log(Obj, key, Obj[key]);
            throw new Error(`没有找到这个变量 ${key}  在${Obj}上,应该在setup中返回！`)
        }
        if (isExactObject(Obj[key])) return JSON.parse(JSON.stringify(Obj[key]))
        return Obj[key]
    }
}

function setValue(keyArr, Obj, value) {
    if (keyArr.length === 1 && isExactObject(Obj)) {
        Obj[keyArr[0]] = value
        return
    }
    else {
        keyArr.shift()
        return setValue(keyArr, Obj[keyArr[0]], value)
    }
}

function setVariability(key, Obj, value) {
    const keyArr = key.split(".")
    //如果value是a.b.c这种类型
    if (keyArr.length !== 1 && key !== "") {
        setValue(keyArr, Obj, value)
    }
    //单一类型
    else {
        Obj[key] = value
        return Obj
    }
}

function deleteFirstIdx(value) {
    value = value.split(".")
    value.shift()
    if (value.length === 1) value = value[0]
    else value = value.join(".")
    return value
}



