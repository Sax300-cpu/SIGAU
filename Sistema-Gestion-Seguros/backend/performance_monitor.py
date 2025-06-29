#!/usr/bin/env python3
"""
Script para monitorear el rendimiento de las operaciones
"""

import time
import functools
import logging
from datetime import datetime

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('performance.log'),
        logging.StreamHandler()
    ]
)

def performance_monitor(func):
    """Decorador para monitorear el rendimiento de funciones"""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        start_datetime = datetime.now()
        
        try:
            result = func(*args, **kwargs)
            end_time = time.time()
            execution_time = (end_time - start_time) * 1000  # Convertir a milisegundos
            
            if execution_time > 1000:  # Si toma más de 1 segundo
                logging.warning(
                    f"FUNCIÓN LENTA: {func.__name__} tomó {execution_time:.2f}ms "
                    f"({start_datetime.strftime('%H:%M:%S')} - {datetime.now().strftime('%H:%M:%S')})"
                )
            elif execution_time > 500:  # Si toma más de 500ms
                logging.info(
                    f"FUNCIÓN MODERADA: {func.__name__} tomó {execution_time:.2f}ms"
                )
            
            return result
            
        except Exception as e:
            end_time = time.time()
            execution_time = (end_time - start_time) * 1000
            logging.error(
                f"ERROR en {func.__name__} después de {execution_time:.2f}ms: {str(e)}"
            )
            raise
    
    return wrapper

def monitor_database_query(query, params=None):
    """Monitorear consultas de base de datos"""
    start_time = time.time()
    
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            try:
                result = func(*args, **kwargs)
                end_time = time.time()
                execution_time = (end_time - start_time) * 1000
                
                if execution_time > 100:  # Si toma más de 100ms
                    logging.warning(
                        f"CONSULTA LENTA: {query[:50]}... tomó {execution_time:.2f}ms"
                    )
                    if params:
                        logging.warning(f"Parámetros: {params}")
                
                return result
                
            except Exception as e:
                end_time = time.time()
                execution_time = (end_time - start_time) * 1000
                logging.error(
                    f"ERROR en consulta {query[:50]}... después de {execution_time:.2f}ms: {str(e)}"
                )
                raise
        
        return wrapper
    return decorator

def log_slow_operations(threshold_ms=1000):
    """Decorador para loggear operaciones lentas"""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            
            try:
                result = func(*args, **kwargs)
                execution_time = (time.time() - start_time) * 1000
                
                if execution_time > threshold_ms:
                    logging.warning(
                        f"OPERACIÓN LENTA: {func.__name__} tomó {execution_time:.2f}ms "
                        f"(umbral: {threshold_ms}ms)"
                    )
                
                return result
                
            except Exception as e:
                execution_time = (time.time() - start_time) * 1000
                logging.error(
                    f"ERROR en {func.__name__} después de {execution_time:.2f}ms: {str(e)}"
                )
                raise
        
        return wrapper
    return decorator

# Ejemplo de uso:
if __name__ == "__main__":
    @performance_monitor
    def test_slow_function():
        """Función de prueba que simula una operación lenta"""
        time.sleep(1.5)  # Simular operación de 1.5 segundos
        return "Completado"
    
    @performance_monitor
    def test_fast_function():
        """Función de prueba que simula una operación rápida"""
        time.sleep(0.1)  # Simular operación de 0.1 segundos
        return "Completado"
    
    print("Probando monitoreo de rendimiento...")
    test_slow_function()
    test_fast_function()
    print("Pruebas completadas. Revisa performance.log para ver los resultados.") 