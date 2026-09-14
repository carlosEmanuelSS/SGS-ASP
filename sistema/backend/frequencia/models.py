import uuid
from django.conf import settings
from django.db import models


class ResponsavelTurma(models.Model):
    oficina = models.ForeignKey('oficinas.Oficina', on_delete=models.PROTECT, related_name='acessos_frequencia')
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['oficina', 'usuario'], name='responsavel_turma_unico')]


class HistoricoAcesso(models.Model):
    oficina = models.ForeignKey('oficinas.Oficina', on_delete=models.PROTECT)
    autor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    antes = models.JSONField(default=list)
    depois = models.JSONField(default=list)
    criado_em = models.DateTimeField(auto_now_add=True)


class Chamada(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    oficina = models.ForeignKey('oficinas.Oficina', on_delete=models.PROTECT, related_name='chamadas')
    data = models.DateField()
    versao = models.PositiveIntegerField(default=1)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-data', 'id']
        constraints = [models.UniqueConstraint(fields=['oficina', 'data'], name='chamada_unica_por_dia')]
        permissions = [('ver_todas_chamadas', 'Consultar chamadas de todas as turmas'),
                       ('gerir_responsaveis', 'Vincular educadores às turmas')]


class Presenca(models.Model):
    chamada = models.ForeignKey(Chamada, on_delete=models.PROTECT, related_name='registros')
    matricula = models.ForeignKey('oficinas.Matricula', on_delete=models.PROTECT, related_name='presencas')
    nome_aluno = models.CharField(max_length=160)
    presente = models.BooleanField()
    justificativa = models.CharField(max_length=500, blank=True)

    class Meta:
        ordering = ['nome_aluno', 'id']
        constraints = [models.UniqueConstraint(fields=['chamada', 'matricula'], name='presenca_unica_na_chamada')]


class RevisaoChamada(models.Model):
    chamada = models.ForeignKey(Chamada, on_delete=models.PROTECT, related_name='revisoes')
    autor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    versao = models.PositiveIntegerField()
    motivo = models.CharField(max_length=300, blank=True)
    alteracoes = models.JSONField(default=list)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-versao']
        constraints = [models.UniqueConstraint(fields=['chamada', 'versao'], name='revisao_chamada_unica')]
