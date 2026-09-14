import uuid
from django.conf import settings
from django.db import models


class Atendimento(models.Model):
    TIPOS = [('social', 'Social'), ('psicologico', 'Psicológico'),
             ('visita_domiciliar', 'Visita domiciliar'), ('encaminhamento', 'Encaminhamento'), ('outro', 'Outro')]
    NIVEIS = [('publico', 'Equipe autorizada'), ('restrito', 'Equipe técnica'),
              ('confidencial', 'Somente o autor')]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    aluno = models.ForeignKey('alunos.Aluno', on_delete=models.PROTECT, related_name='atendimentos')
    autor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    data = models.DateField(db_index=True)
    tipo = models.CharField(max_length=30, choices=TIPOS)
    nivel = models.CharField(max_length=20, choices=NIVEIS, default='confidencial')
    descricao = models.TextField(max_length=10000)
    encaminhamento = models.CharField(max_length=500, blank=True)
    cancelado = models.BooleanField(default=False)
    versao = models.PositiveIntegerField(default=1)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-data', '-criado_em', 'id']
        permissions = [('ler_restritos', 'Consultar atendimentos da equipe técnica'),
                       ('ver_indicadores', 'Consultar indicadores e relatórios')]
        constraints = [
            models.CheckConstraint(condition=models.Q(nivel__in=['publico', 'restrito', 'confidencial']), name='atendimento_nivel_valido'),
            models.CheckConstraint(condition=models.Q(tipo__in=['social', 'psicologico', 'visita_domiciliar', 'encaminhamento', 'outro']), name='atendimento_tipo_valido'),
        ]


class RevisaoAtendimento(models.Model):
    atendimento = models.ForeignKey(Atendimento, on_delete=models.PROTECT, related_name='revisoes')
    autor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    versao = models.PositiveIntegerField()
    motivo = models.CharField(max_length=300, blank=True)
    dados = models.JSONField()
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-versao']
        constraints = [models.UniqueConstraint(fields=['atendimento', 'versao'], name='revisao_atendimento_unica')]


class Doacao(models.Model):
    TIPOS = [('dinheiro', 'Dinheiro'), ('alimentos', 'Alimentos'), ('roupas', 'Roupas'),
             ('materiais', 'Materiais'), ('outro', 'Outro')]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    data = models.DateField(db_index=True)
    tipo = models.CharField(max_length=20, choices=TIPOS)
    doador = models.CharField(max_length=160, blank=True)
    descricao = models.CharField(max_length=1000)
    valor = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    quantidade = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    unidade = models.CharField(max_length=40, blank=True)
    cancelado = models.BooleanField(default=False)
    versao = models.PositiveIntegerField(default=1)
    autor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-data', '-criado_em', 'id']
        constraints = [
            models.CheckConstraint(condition=(
                models.Q(tipo='dinheiro', valor__isnull=False, valor__gt=0, quantidade__isnull=True, unidade='') |
                (models.Q(tipo__in=['alimentos', 'roupas', 'materiais', 'outro'], valor__isnull=True,
                          quantidade__isnull=False, quantidade__gt=0) & ~models.Q(unidade=''))
            ), name='doacao_medida_valida'),
        ]


class RevisaoDoacao(models.Model):
    doacao = models.ForeignKey(Doacao, on_delete=models.PROTECT, related_name='revisoes')
    autor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    versao = models.PositiveIntegerField()
    motivo = models.CharField(max_length=300, blank=True)
    dados = models.JSONField()
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-versao']
        constraints = [models.UniqueConstraint(fields=['doacao', 'versao'], name='revisao_doacao_unica')]
