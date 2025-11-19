import firebase_admin
from firebase_admin import credentials
from firebase_admin import db
import json
import os
from datetime import datetime

class HistoricoFirebase:
    """Gerencia histórico de ações em Firebase sem alterar o banco MySQL"""
    
    def __init__(self):
        self.usar_firebase = False
        self.historico_local = []
        
        # Tentar conectar ao Firebase
        try:
            if os.path.exists("credentials.json"):
                cred = credentials.Certificate("credentials.json")
                firebase_admin.initialize_app(cred, {
                    'databaseURL': 'https://seu-projeto.firebaseio.com'
                })
                self.usar_firebase = True
                print("[v0] SUCESSO: Conectado ao Firebase!")
        except Exception as e:
            print(f"[v0] Firebase não configurado, usando armazenamento local: {str(e)}")
    
    def registrar_acao(self, documento_id, acao, usuario_id, comentarios, novo_status):
        """Registra ação de confirmar/revisar em Firebase ou local fallback"""
        
        registro = {
            "documento_id": documento_id,
            "acao": acao,
            "usuario_id": usuario_id,
            "comentarios": comentarios,
            "novo_status": novo_status,
            "data_hora": datetime.now().isoformat(),
            "timestamp": int(datetime.now().timestamp())
        }
        
        try:
            if self.usar_firebase:
                # Salvar no Firebase
                ref = db.reference(f"documentos/{documento_id}/historico")
                ref.push(registro)
            else:
                # Salvar localmente em JSON
                arquivo_historico = f"historico_local_{documento_id}.json"
                
                if os.path.exists(arquivo_historico):
                    with open(arquivo_historico, 'r', encoding='utf-8') as f:
                        historico = json.load(f)
                else:
                    historico = []
                
                historico.append(registro)
                
                with open(arquivo_historico, 'w', encoding='utf-8') as f:
                    json.dump(historico, f, ensure_ascii=False, indent=2)
            
            print(f"[v0] Ação registrada: {acao} no documento {documento_id}")
            return True
            
        except Exception as e:
            print(f"[v0] Erro ao registrar ação: {str(e)}")
            return False
    
    def obter_historico(self, documento_id):
        """Obtém histórico de ações"""
        
        try:
            if self.usar_firebase:
                ref = db.reference(f"documentos/{documento_id}/historico")
                historico = ref.get()
                return historico if historico else []
            else:
                arquivo_historico = f"historico_local_{documento_id}.json"
                
                if os.path.exists(arquivo_historico):
                    with open(arquivo_historico, 'r', encoding='utf-8') as f:
                        return json.load(f)
                else:
                    return []
                    
        except Exception as e:
            print(f"[v0] Erro ao obter histórico: {str(e)}")
            return []

# Instância global
historico_db = HistoricoFirebase()
