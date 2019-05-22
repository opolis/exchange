RUN = docker run -it --rm \
	--env-file .env.aws \
	-v $(PWD):/src \
	-w /src \
	node:8.10

RUN_MYSQL = docker run -d --rm \
	--name=mysql \
	--network opolis-exchange \
	-e MYSQL_DATABASE=exchange \
	-e MYSQL_ROOT_HOST='%' \
	-e MYSQL_ROOT_PASSWORD=password \
	-v $(PWD)/db:/docker-entrypoint-initdb.d \
	-p 0.0.0.0:3306:3306 \
	mysql/mysql-server:5.7

.PHONY: api
api:
	@sam local start-api \
		--region us-west-2 \
		--docker-network opolis-exchange \
		--template sam.json \
		--env-vars .env.json \
		--docker-volume-basedir $(PWD)

# Usage: COIN=BTC EVENT=event.json make invoke
.PHONY: invoke
invoke:
	@python webhook/event.py $(COIN) $(EVENT) | sam local invoke \
		--template sam.json \
		--env-vars .env.json \
		--region us-west-2 \
		--docker-network opolis-exchange \
		ProcessFunction

.PHONY: deps
deps:
	@$(RUN) npm install

.PHONY: mysql
mysql:
	@$(RUN_MYSQL)
	@docker logs -f mysql 2>&1

.PHONY: shell
shell:
	@$(RUN) bash
