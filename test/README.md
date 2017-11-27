## How to run the test?


```shell
cd test

docker run -it --rm -e DEV_UID=$(id -u) -e DEV_GID=$(id -g) -e TASK_DIR=tasks/ -v $(pwd)/:/usr/local/app docker.orbis.pe/apt-micro-js gulp

```
