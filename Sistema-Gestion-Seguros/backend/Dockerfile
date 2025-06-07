# 1. Imagen base ligera de Python
FROM python:3.10-slim

# 2. Evitar ficheros .pyc y forzar salida en tiempo real
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 3. Directorio de trabajo dentro del contenedor
WORKDIR /app

# 4. Copiar y instalar dependencias
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copiar todo el código de tu carpeta backend/
COPY backend/ .

# 6. Exponer el puerto donde corre Flask
EXPOSE 5000

# 7. Comando por defecto al arrancar el contenedor
CMD ["python", "app.py"]
