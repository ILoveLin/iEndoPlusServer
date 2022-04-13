# node
FROM node:latest
# pm2
RUN npm install pm2 -g
# 镜像作者，可以附加联系信息
LABEL maintainer = "cme"

# 创建容器内的项目存放目录
RUN mkdir -p /home/iendo
WORKDIR /home/iendo

#  将Dockerfile当前目录下所有文件拷贝至容器内项目目录并安装项目依赖
COPY . /home/iendo
RUN npm install

# 容器对外暴露的端口号，要和node项目配置的端口号一致
EXPOSE 3000

# 容器启动时执行的命令
CMD [ "pm2-runtime", "start", "process.json" ]