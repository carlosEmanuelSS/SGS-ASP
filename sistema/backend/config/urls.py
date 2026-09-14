from django.contrib import admin
from django.urls import path
from alunos import views
from oficinas import views as oficinas
from frequencia import views as frequencia
from gestao import views as gestao
from gestao.relatorios import relatorio
from config.health import health

urlpatterns = [
    path('healthz/', health),
    path('api/atendimentos/', gestao.atendimentos),
    path('api/atendimentos/<uuid:pk>/', gestao.atendimento),
    path('api/doacoes/', gestao.doacoes),
    path('api/doacoes/<uuid:pk>/', gestao.doacao),
    path('api/relatorios/', relatorio),
    path('api/senha/', views.alterar_senha),
    path('api/frequencia/turmas/', frequencia.turmas),
    path('api/frequencia/turmas/<uuid:pk>/chamada/', frequencia.chamada),
    path('api/frequencia/turmas/<uuid:pk>/historico/', frequencia.historico),
    path('api/frequencia/turmas/<uuid:pk>/responsaveis/', frequencia.responsaveis),
    path('admin/', admin.site.urls),
    path('api/session/', views.session),
    path('api/login/', views.sign_in),
    path('api/logout/', views.sign_out),
    path('api/alunos/', views.alunos),
    path('api/alunos/<uuid:pk>/', views.aluno_detail),
    path('api/oficinas/', oficinas.oficinas),
    path('api/oficinas/<uuid:pk>/', oficinas.detalhe),
    path('api/oficinas/<uuid:pk>/candidatos/', oficinas.candidatos),
    path('api/oficinas/<uuid:pk>/matriculas/', oficinas.matricular),
    path('api/oficinas/<uuid:pk>/matriculas/<uuid:matricula_id>/cancelar/', oficinas.cancelar),
]
