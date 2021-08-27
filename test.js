const a = axios.create({
    baseUrl: "http//localhost:3000/api",
    timeout: 200,
    method: "post",
    data: {
        userId: "2017211018",
        usename: "黄震",
        teacherClass: "SJ00201A2031780001"
    },
    headers: {
        token: "xxx"
    }
})

const options = {
    state: "1",
    pageSize: "9"
}

a.request({
    ...options,
    url: "/student/Compnents"
})

const b = {
    baseUrl: "http//localhost:3000/api",
    timeout: 200,
    method: "post",
    data: {
        userId: "2017211018",
        usename: "黄震",
        teacherClass: "SJ00201A2031780001"
    },
    headers: {
        token: "xxx"
    },
    state: "1",
    pageSize: "9",
    url: "/student/Compnents"
}

const c = {
    baseUrl: "http//localhost:3000/api",
    timeout: 200,
    method: "post",
    data: {
        teacherClass: "SJ00201A2031780001",
        pageSize: "9",
        state: "1",
    },
    headers: {
        token: "xxx"
    },
    url: "/student/Compnents"
}
