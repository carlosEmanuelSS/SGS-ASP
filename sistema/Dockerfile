FROM node:24-bookworm-slim AS frontend
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt && useradd --create-home --uid 10001 sgs
COPY --chown=sgs:sgs backend/ ./
COPY --from=frontend --chown=sgs:sgs /frontend/dist /app/frontend/dist
USER sgs
RUN DJANGO_DEBUG=true python manage.py collectstatic --noinput
EXPOSE 8000
CMD ["waitress-serve", "--listen=0.0.0.0:8000", "--threads=4", "--max-request-body-size=1048576", "--trusted-proxy=*", "--trusted-proxy-headers=x-forwarded-for x-forwarded-proto", "--trusted-proxy-count=1", "config.wsgi:application"]
