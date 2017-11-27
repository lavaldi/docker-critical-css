.PHONY: all clean

## general ##
ENV = prod
IMAGE_NAME = critical-css

## dev ##

TAG_DEV    = dev

## deploy ##

DEPLOY_REGISTRY = my_registry
TAG_DEPLOY      = latest

## result var ##
IMAGE_DEPLOY = ${IMAGE_NAME}:${TAG_DEPLOY}
IMAGE_DEV    = ${IMAGE_NAME}:${TAG_DEV}

build:
	IMAGE_DEV=${IMAGE_DEV} \
	docker-compose -f docker-compose.build.yml build

deploy: build
	cp docker/latest/Dockerfile .
	docker build --no-cache --build-arg IMAGE_DEV=${IMAGE_DEV} -t ${DEPLOY_REGISTRY}/${IMAGE_DEPLOY} .
	rm Dockerfile
	#@make publish

publish:
	docker push ${DEPLOY_REGISTRY}/${IMAGE_DEPLOY}

critical:
	IMAGE_DEV=${IMAGE_DEV} \
	ENV=${ENV} \
	docker-compose run --rm critical

install:
	IMAGE_DEV=${IMAGE_DEV} \
	docker-compose run --rm install
