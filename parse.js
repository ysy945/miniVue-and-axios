

// parse函数，主函数
function parse(templateString) {
    // 指针
    var index = 0;
    // 剩余部分
    var rest = '';
    // 开始标记
    var startRegExp = /^\<([a-z]+[1-6]?)(\s[^\<]+)?\>/;
    // 结束标记
    var endRegExp = /^\<\/([a-z]+[1-6]?)\>/;
    // 抓取结束标记前的文字
    var wordRegExp = /^([^\<]+)\<\/[a-z]+[1-6]?\>/;
    // 准备两个栈
    var stack1 = [];
    var stack2 = [{ 'children': [] }];

    while (index < templateString.length - 1) {
        rest = templateString.substring(index);
        // console.log(templateString[index]);
        if (startRegExp.test(rest)) {
            // 识别遍历到的这个字符，是不是一个开始标签
            let tag = rest.match(startRegExp)[1];
            let attrsString = rest.match(startRegExp)[2];
            // console.log('检测到开始标记', tag);
            // 将开始标记推入栈1中
            stack1.push(tag);
            // 将空数组推入栈2中
            stack2.push({ 'tag': tag, 'children': [], 'attrs': parseAttrsString(attrsString) });
            // 得到attrs字符串的长度
            const attrsStringLength = attrsString != null ? attrsString.length : 0;
            // 指针移动标签的长度加2再加attrString的长度，为什么要加2呢？因为<>也占两位
            index += tag.length + 2 + attrsStringLength;
        } else if (endRegExp.test(rest)) {
            // 识别遍历到的这个字符，是不是一个结束标签
            let tag = rest.match(endRegExp)[1];
            // console.log('检测到结束标记', tag);
            let pop_tag = stack1.pop();
            // 此时，tag一定是和栈1顶部的是相同的
            if (tag == pop_tag) {
                let pop_arr = stack2.pop();
                if (stack2.length > 0) {
                    stack2[stack2.length - 1].children.push(pop_arr);
                }
            } else {
                throw new Error(pop_tag + '标签没有封闭！！');
            }
            // 指针移动标签的长度加3，为什么要加2呢？因为</>也占3位
            index += tag.length + 3;
        } else if (wordRegExp.test(rest)) {
            // 识别遍历到的这个字符，是不是文字，并别不能是全空
            let word = rest.match(wordRegExp)[1];
            // 看word是不是全是空
            if (!/^\s+$/.test(word)) {
                // 不是全是空 
                // console.log('检测到文字', word);
                // 改变此时stack2栈顶元素中
                stack2[stack2.length - 1].children.push({ 'text': word, 'type': 3 });
            }
            // 指针移动标签的长度加3，为什么要加2呢？因为</>也占3位
            index += word.length;
        } else {
            index++;
        }
    }

    // 此时stack2就是我们之前默认放置的一项了，此时要返回这一项的children即可
    return stack2[0].children[0];
};

function parseAttrsString(attrsString) {
    if (attrsString == undefined) return [];
    console.log(attrsString);
    // 当前是否在引号内
    var isYinhao = false
    // 断点
    var point = 0;
    // 结果数组
    var result = [];

    // 遍历attrsString，而不是你想的用split()这种暴力方法
    for (let i = 0; i < attrsString.length; i++) {
        let char = attrsString[i];
        if (char == '"') {
            isYinhao = !isYinhao;
        } else if (char == ' ' && !isYinhao) {
            // 遇见了空格，并且不在引号中
            console.log(i);
            if (!/^\s*$/.test(attrsString.substring(point, i))) {
                result.push(attrsString.substring(point, i).trim());
                point = i;
            }
        }
    }
    // 循环结束之后，最后还剩一个属性k="v"
    result.push(attrsString.substring(point).trim());

    // 下面的代码功能是，将["k=v","k=v","k=v"]变为[{name:k, value:v}, {name:k, value:v}, {name:k,value:v}];
    result = result.map(item => {
        // 根据等号拆分
        const o = item.match(/^(.+)="(.+)"$/);
        return {
            name: o[1],
            value: o[2]
        };
    });

    return result;
}
var templateString = `<div>
    <h3 class="aa bb cc" data-n="7" id="mybox">你好</h3>
    <ul>
        <li>A</li>
        <li>B</li>
        <li>C</li>
    </ul>
</div>`;
const ast = parse(templateString);
console.log(ast);