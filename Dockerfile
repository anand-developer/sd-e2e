FROM mcr.microsoft.com/playwright:v1.62.0-noble

WORKDIR /sd-e2e

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

ENV BASE_URL=https://www.saucedemo.com

CMD ["npx", "playwright", "test"]
