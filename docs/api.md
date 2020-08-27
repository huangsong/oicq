# API和事件

+ [oicq.createClient(uin[,config])](#oicq.createClient(uin[,config]))
+ [Class: oicq.Client](#Class-Client)
  + [Events](#Events)
    + [Event: system](#Event-system)
    + [Event: message](#Event-message)
    + [Event: request](#Event-request)
    + [Event: notice](#Event-notice)
  + [client.login(password_md5)](#client.login(password_md5))
  + [client.captchaLogin(captcha)](#client.captchaLogin(captcha))
  + [client.terminate()](#client.terminate())
  + [APIs](#APIs)

----

## `oicq.createClient(uin[,config])`

+ `uin` \<number>
+ `config` \<Object>

创建一个实例：

```js
const oicq = require("oicq");
const uin = 123456789, config = {};
const client = oicq.createClient(uin, config);
```

config说明：

```js
//默认配置
const config = {
    platform:       2,      //登陆类型 1手机 2平板
    log_level:      "info", //日志级别，有trace,debug,info,warn,error,fatal,off
    kickoff:        false,  //被挤下线是否在3秒后反挤对方
    ignore_self:    true,   //群聊是否无视自己的发言
    device_path:            //设备文件保存路径，默认为启动文件同目录下的data文件夹
};
```

※ 不建议在单个工作线程中运行多个实例。如果确实有需要，建议使用 [Worker threads](https://nodejs.org/dist/latest/docs/api/worker_threads.html) 或 [Child process](https://nodejs.org/dist/latest/docs/api/child_process.html) 管理实例。

----

## Class: `Client`

只能使用工厂方法 createClient 创建实例。

----

## Events (与 [CQHTTP](https://github.com/howmanybots/onebot/blob/master/v11/specs/event/README.md) 大同小异)

使用 `client.on()` 来监听一个事件：

```js
client.on("system.login", (data)=>{
    console.log(data);
});
```

事件为冒泡传递，例如 `request.group.add` 事件，若未监听会沿着 `request.group` 传递到 `request`  
事件使用cqhttp风格命名和参数，所有事件数据都为json对象，并包含以下共通字段：

+ `self_id`
+ `time` 毫秒级
+ `post_type` 一级分类 system, message, request, notice
+ `{post_type}_type` 二级分类如 system.login, request.group
+ `sub_type` 三级分类，有时会没有

----

## Event: `system`

+ `system.login`
  + `system.login.captcha` 收到验证码 `image` 字段为图像Buffer
  + `system.login.device` 需要解设备锁 `url` 字段为设备锁验证地址
  + `system.login.error` 其他原因如密码错误 `message` 字段为失败原因
+ `system.online` 上线事件，可以开始处理消息
+ `system.offline` 下线事件
  + `system.offline.network` 网络断开
  + `system.offline.frozen` 被冻结
  + `system.offline.kickoff` 另一处登陆
  + `system.offline.unknown` 未知
+ `system.reconn` 断线重连时触发，重连后会触发 `online` 事件
  + 长时间未发消息会被服务器断开，触发这个事件

----

## Event: `message`

+ `message.private`
  + `message.private.friend`
  + `message.private.single` 单向好友(对方未加你)
  + `message.private.group` 群临时会话
    + 现在 `sender` 字段中会有完整的该群员数据
  + `message.private.other`
+ `message.group`
  + `message.group.normal`
  + `message.group.anonymous`

----

## Event: `request`

+ `request.friend`
  + `message.friend.add`
+ `request.group`
  + `message.group.add`
  + `message.group.invite`

----

## Event: `notice`

为了统一风格，notice事件的命名和原版cqhttp有一定出入

+ `notice.friend`
  + `notice.friend.increase`
  + `notice.friend.recall`
+ `notice.group`
  + `notice.group.increase`
  + `notice.group.decrease`
    + 字段 `dismiss` 表示是否是解散
  + `notice.group.recall`
  + `notice.group.admin`
    + Boolean型字段 `set` 表示设置或取消
  + `notice.group.ban`
  + `notice.group.transfer` 群转让
    + 有 `old_owner_id` 和 `new_owner_id` 字段

~~还有一些细微差异，比如新增了一些字段，可以作为彩蛋~~

----

## 系统类API

## `client.login(password_md5)` 密码登陆

+ `password_md5` \<string|Buffer> md5后的密码，可以是字符串或Buffer

----

## `client.captchaLogin(captcha)` 验证码登陆

+ `captcha` \<string> 4个字母

----

## `client.terminate()` 关闭连接

----

## APIs (与 [CQHTTP](https://github.com/howmanybots/onebot/blob/master/v11/specs/api/public.md) 大同小异)

同步函数会直接返回。

异步函数标注为 `async` ，返回的是 `Promise` ，返回值为以下格式的json对象：

```js
{
    retcode: 0,     //0成功 1状态未知 100参数错误 102失败 103超时
    status: "ok",   //ok或async或failed
    data: null,     //数据
    error: "",      //失败的时候偶尔会有这个字段
}
```

----

### 获取列表和info

+ async `client.getFriendList([no_cache])`
+ async `client.getGroupList([no_cache])`
+ async `client.getGroupMemberList(group_id[, no_cache])`
  + 获取列表返回的是ES6的Map类型，不是数组
+ async `client.getGroupInfo(group_id[, no_cache])`
+ async `client.getGroupMemberInfo(group_id, user_id[, no_cache])`
+ async `client.getStrangerInfo(user_id)`

----

### 消息类

message可以使用 `Array` 格式或 `String` 格式，支持CQ码

+ async `client.sendPrivateMsg(user_id, message[, auto_escape])`
+ async `client.sendGroupMsg(group_id, user_id, message[, auto_escape])`
+ async `client.deleteMsg(message_id)`
  + `message_id` 现在是字符串，保存了所有撤回时需要用到的数据

----

### 处理申请

+ async `client.setFriendAddRequest(flag[, approve, block])`
+ async `client.setGroupAddRequest(flag[, approve, block, reason])`
  + block字段表示是否拉黑，默认false

----

+ async `client.setGroupKick(group_id, user_id[, reject_add_request])`
+ async `client.setGroupBan(group_id, user_id[, duration])`
+ async `client.setGroupLeave(group_id)`

----

+ `client.canSendImage()`
+ `client.canSendRecord()`
+ `client.getStatus()`
+ `client.getVersionInfo()`
+ `client.getLoginInfo()`

----

## 增强API

+ `client.changeOnlineStatus(status)`
  + `status` 允许的值：11我在线上 31离开 41隐身 50忙碌 60Q我吧 70请勿打扰