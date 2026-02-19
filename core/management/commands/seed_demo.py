from __future__ import annotations

import random
import uuid
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from faker import Faker

from core.models import Client, Deal, DocumentTemplate, MarketingCampaign, Product, ServiceItem, User


class Command(BaseCommand):
    help = "Seed demo data for CRM"

    def add_arguments(self, parser):
        parser.add_argument("--clean", action="store_true", help="Delete existing data before seed")

    @transaction.atomic
    def handle(self, *args, **options):
        fake = Faker("pt_BR")
        Faker.seed(42)
        random.seed(42)

        if options.get("clean"):
            self.stdout.write(self.style.WARNING("Cleaning existing data..."))
            ServiceItem.objects.all().delete()
            Deal.objects.all().delete()
            MarketingCampaign.objects.all().delete()
            DocumentTemplate.objects.all().delete()
            Product.objects.all().delete()
            Client.objects.all().delete()
            User.objects.all().delete()

        tenant_id = uuid.uuid4()
        self.stdout.write(self.style.SUCCESS(f"Creating tenant InterTouring: {tenant_id}"))

        admin, created = User.objects.get_or_create(
            email="admin@intertouring.local",
            defaults={
                "full_name": "Administrador InterTouring",
                "tenant_id": tenant_id,
                "is_staff": True,
                "is_superuser": True,
                "is_active": True,
            },
        )
        admin.set_password("admin")
        admin.save(update_fields=["password"])
        self.stdout.write(self.style.SUCCESS("Admin created/updated: admin@intertouring.local / admin"))

        self.stdout.write("Creating 30 clients...")
        clients: list[Client] = []
        for i in range(30):
            stage = Client.LifecycleStage.LEAD if i < 10 else random.choice(
                [Client.LifecycleStage.ACTIVE, Client.LifecycleStage.VIP, Client.LifecycleStage.CHURN]
            )
            client = Client.objects.create(
                tenant_id=tenant_id,
                name=fake.name(),
                email=fake.unique.email(),
                phone=fake.phone_number()[:60],
                lifecycle_stage=stage,
                is_top_10=i < 5,
                purchase_history=random.sample(["Transfer", "Hospedagem", "Passeio", "Aéreo"], k=random.randint(0, 2)),
            )
            clients.append(client)

        self.stdout.write("Creating 20 products...")
        preset = [
            ("Transfer Rio-Búzios", "Transfer", ["rio", "búzios", "transfer"]),
            ("City Tour Cristo", "Passeio", ["cristo", "city", "tour"]),
            ("Passeio de Barco Angra", "Passeio", ["barco", "angra", "ilha"]),
            ("Hospedagem Copacabana", "Hospedagem", ["hotel", "copacabana", "hospedagem"]),
            ("Aéreo SDU-GRU", "Aéreo", ["aéreo", "passagem", "voo"]),
        ]
        products: list[Product] = []
        for name, category, keywords in preset:
            products.append(Product.objects.create(tenant_id=tenant_id, name=name, category=category, keywords=keywords))
        while len(products) < 20:
            p = Product.objects.create(
                tenant_id=tenant_id,
                name=f"{random.choice(['Transfer', 'Passeio', 'Pacote', 'Hotel'])} {fake.city()}",
                category=random.choice(["Transfer", "Hospedagem", "Passeio", "Aéreo"]),
                keywords=random.sample(["vip", "familia", "executivo", "praia", "tour", "hotel", "transfer"], 3),
            )
            products.append(p)

        self.stdout.write("Creating 50 deals over last 6 months...")
        stage_bag = (
            [Deal.Stage.NEW] * 15
            + [Deal.Stage.PROPOSAL] * 10
            + [Deal.Stage.WON] * 5
            + [Deal.Stage.LOST] * 5
            + [random.choice([Deal.Stage.QUALIFIED, Deal.Stage.NEGOTIATION, Deal.Stage.NEW]) for _ in range(15)]
        )
        random.shuffle(stage_bag)

        now = timezone.now()
        deals: list[Deal] = []
        for i in range(50):
            stage = stage_bag[i]
            client = random.choice(clients)
            created_at = now - timedelta(days=random.randint(0, 180))
            amount = Decimal(random.randint(800, 5000))
            if stage == Deal.Stage.WON:
                amount = Decimal(random.randint(12000, 45000))

            deal = Deal.objects.create(
                tenant_id=tenant_id,
                client=client,
                title=f"{random.choice(['Pacote', 'Roteiro', 'Reserva'])} {fake.city()}",
                board=Deal.Board.TOP10 if client.is_top_10 else random.choice([Deal.Board.SALES, Deal.Board.COMMERCIAL]),
                stage=stage,
                priority=random.choice([Deal.Priority.NORMAL, Deal.Priority.HIGH, Deal.Priority.CRITICAL]),
                source=random.choice([Deal.Source.EMAIL, Deal.Source.WHATSAPP, Deal.Source.INDICATION]),
                tags=random.sample(["VIP", "NOVO_CLIENTE", "PRODUTO_NOVO", "URGENTE"], k=random.randint(0, 2)),
                email_thread_id=f"thread-{i}",
                amount=amount,
            )
            Deal.objects.filter(id=deal.id).update(created_at=created_at, updated_at=created_at)
            deals.append(deal)

            if stage == Deal.Stage.WON:
                for _ in range(random.randint(1, 3)):
                    base_cost = Decimal(random.randint(200, 2000))
                    margin_factor = Decimal(str(random.choice([1.2, 1.35, 1.5, 1.7])))
                    ServiceItem.objects.create(
                        tenant_id=tenant_id,
                        deal=deal,
                        description=random.choice(products).name,
                        quantity=random.randint(1, 4),
                        cost_price=base_cost,
                        sale_price=(base_cost * margin_factor).quantize(Decimal("0.01")),
                    )

        self.stdout.write("Creating templates and marketing draft...")
        DocumentTemplate.objects.get_or_create(
            tenant_id=tenant_id,
            name="Voucher de Transfer",
            type=DocumentTemplate.TemplateType.VOUCHER,
            defaults={
                "html_body": """
                <html><body>
                <h1>Voucher de Transfer</h1>
                <p>Cliente: {{ deal.client.name }}</p>
                <p>Contato: {{ contact.email }}</p>
                <p>Serviço: {{ ai.product_detail if ai else 'Transfer' }}</p>
                </body></html>
                """,
            },
        )

        MarketingCampaign.objects.get_or_create(
            tenant_id=tenant_id,
            subject="Promoção de Carnaval",
            defaults={
                "html_content": "<h1>Promoção de Carnaval</h1><p>Olá {{ name }}, confira nossas ofertas!</p>",
                "target_filters": {"lifecycle_stage": "LEAD"},
                "status": MarketingCampaign.Status.DRAFT,
            },
        )

        self.stdout.write(self.style.SUCCESS("Seed concluído com sucesso."))
