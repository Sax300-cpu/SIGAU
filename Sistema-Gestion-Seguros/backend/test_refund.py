#!/usr/bin/env python3
"""
Script de prueba para verificar la funcionalidad de reembolsos
"""

import requests
import json

# Configuración
BASE_URL = "http://localhost:5000"
TEST_USER_EMAIL = "cliente@test.com"  # Cambiar por un email de cliente válido
TEST_USER_PASSWORD = "password123"    # Cambiar por la contraseña correcta

def test_login():
    """Probar login de cliente"""
    print("=== Probando login ===")
    
    login_data = {
        "email": TEST_USER_EMAIL,
        "password": TEST_USER_PASSWORD
    }
    
    response = requests.post(f"{BASE_URL}/login", data=login_data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        print("✅ Login exitoso")
        return True
    else:
        print("❌ Login falló")
        return False

def test_get_refunds():
    """Probar obtener lista de reembolsos"""
    print("\n=== Probando obtener reembolsos ===")
    
    response = requests.get(f"{BASE_URL}/refunds")
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        refunds = response.json()
        print(f"✅ Reembolsos obtenidos: {len(refunds)}")
        for refund in refunds:
            print(f"  - ID: {refund.get('refund_id')}, Estado: {refund.get('status')}, Póliza: {refund.get('policy_name')}")
    else:
        print(f"❌ Error al obtener reembolsos: {response.text}")

def test_create_refund_with_contract():
    """Probar crear reembolso con contract_id"""
    print("\n=== Probando crear reembolso con contract_id ===")
    
    # Usar un contract_id válido (cambiar por uno real)
    refund_data = {
        "contract_id": "1",  # Cambiar por un contract_id válido
        "reason": "cancelation",
        "reason_description": "Prueba de reembolso desde script"
    }
    
    response = requests.post(
        f"{BASE_URL}/refunds",
        headers={"Content-Type": "application/json"},
        data=json.dumps(refund_data)
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 201:
        print("✅ Reembolso creado exitosamente")
    else:
        print("❌ Error al crear reembolso")

def test_create_refund_with_policy():
    """Probar crear reembolso con policy_id"""
    print("\n=== Probando crear reembolso con policy_id ===")
    
    # Usar un policy_id válido (cambiar por uno real)
    refund_data = {
        "policy_id": "1",  # Cambiar por un policy_id válido
        "reason": "overpayment",
        "reason_description": "Prueba de reembolso con policy_id desde script"
    }
    
    response = requests.post(
        f"{BASE_URL}/refunds",
        headers={"Content-Type": "application/json"},
        data=json.dumps(refund_data)
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 201:
        print("✅ Reembolso creado exitosamente")
    else:
        print("❌ Error al crear reembolso")

def test_get_contracts():
    """Probar obtener contratos del cliente"""
    print("\n=== Probando obtener contratos ===")
    
    response = requests.get(f"{BASE_URL}/contracts")
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        contracts = response.json()
        print(f"✅ Contratos obtenidos: {len(contracts)}")
        for contract in contracts:
            print(f"  - ID: {contract.get('id')}, Nombre: {contract.get('name')}, Estado: {contract.get('status')}")
    else:
        print(f"❌ Error al obtener contratos: {response.text}")

def main():
    """Función principal"""
    print("🧪 Iniciando pruebas de funcionalidad de reembolsos")
    print("=" * 50)
    
    # Probar login
    if not test_login():
        print("❌ No se puede continuar sin login exitoso")
        return
    
    # Probar obtener contratos
    test_get_contracts()
    
    # Probar obtener reembolsos
    test_get_refunds()
    
    # Probar crear reembolsos
    test_create_refund_with_contract()
    test_create_refund_with_policy()
    
    print("\n" + "=" * 50)
    print("🏁 Pruebas completadas")

if __name__ == "__main__":
    main() 