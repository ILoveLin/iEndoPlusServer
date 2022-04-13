#iendo项目部署
## 1 安装nodejs
安装 [node-v16.9.1-x64.msi](node-v16.9.1-x64.msi)
## 2 安装项目运行管理（pm2）
`npm install -g pm2`
## 3 安装pm2为windows-service
`npm i -g pm2-windows-service`
## 4 配置windows-service
`pm2-service-install`  
提示 `Perform environment setup ?` 选 n, 继续
## 5 配置pm2环境变量
右键 [我的电脑] - [属性] - [高级系统设置] - [环境变量] - 新建 [系统变量]    
PM2_HOME=C:\Users\Administrator\.pm2（pm2安装路径，需要自己确认）
## 6 确认PM2服务是否已经启动
<kbd>Win</kbd>+<kbd>R</kbd> 输入`services.msc`  
查看是否有 `PM2` 这个服务
## 7 安装项目依赖环境
cd 到项目目录iendo  
`cd ..`  
`cd D:\iendo`  
`npm install --save`
##### windows7 由于node版本较低，在安装依赖 `npm install --save`  
会出现警告 `found x vulnerabilities(xxx)`  
执行`npm audit fix` 进行修复  
## 8 设置静态资源目录
打开项目下deviceConfig.ini文件
修改imagesPath、videosPath 不同设备路径不同，一体机和耳鼻喉有相应的文件夹路径
## 9 启动项目
`pm2 start process.json` (在项目目录)  
如果报错`[PM2] Spawning PM2 daemon with pm2_home=C:\Users\admin\.pm2`  
使用管理员运行CMD，cd到项目目录重复 `步骤8`
## 10 添加到自启动服务
`pm2 save`
## 11 pm2日志分割
使用管理员运行CMD  
`pm2 install pm2-logrotate`
`pm2 set pm2-logrotate:retain 50` // 超过50个就自动删除
## 12 确认项目正常启动
打开浏览器输入 http://localhost:3000  
出现welcome to IEndo 说明启动成功
## 13 验证开机自启动
关闭设备，重新启动，重复 `步骤10`
## 14 重启之后项目未启动
`pm2 delete iendo`  
`pm2 update`  
`pm2 start process.json`(在项目目录)  
`pm2 save`  
重复 `步骤11`
## 15 负载均衡
`process.json`中添加  
`"instances": "max", "exec_mode": "cluster"`

## 自定义端口
在iendo项目中  
找到`app.js`文件, 修改`process.env.PORT = 3000`  
找到`package.json`文件，修改url中端口  
```
"apidoc": {
    "title": "iEndo接口文档",
    "url": "http://localhost:3000"
  }
```

## pm2 常用指令
```
pm2 list // 查看运行的所有项目
pm2 logs // 查看log信息
pm2 delete <service_name> // 删除项目
pm2 stop <service_name> // 停止项目
pm2 restart <service_name> // 重启项目
```


