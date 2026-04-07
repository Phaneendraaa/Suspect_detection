FROM node:18 as build

WORKDIR /app

COPY package*.json ./

# 🔥 IMPORTANT FIX (same as your manual steps)
RUN npm install ajv@6 ajv-keywords@3

# 🔥 IMPORTANT
RUN npm install --legacy-peer-deps

COPY . .

COPY .env .env

RUN npm run build

FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]