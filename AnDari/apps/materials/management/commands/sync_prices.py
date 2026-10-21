from django.core.management.base import BaseCommand
from apps.materials.services import PriceSyncService


class Command(BaseCommand):
    help = 'Sinkronisasi data harga material dan labor dari API Kangjati/Warungjati'

    def add_arguments(self, parser):
        parser.add_argument('--source', type=str, choices=['kangjati', 'warungjati'], required=True)
        parser.add_argument('--url', type=str, required=True, help='URL Endpoint API Provider')

    def handle(self, *args, **options):
        source = options['source']
        url = options['url']

        self.stdout.write(f"Menghubungi API {source}...")
        result = PriceSyncService.sync_from_api(source_name=source, api_url=url)

        if result.get('status') == 'success':
            self.stdout.write(self.style.SUCCESS(result['message']))
        else:
            self.stdout.write(self.style.ERROR(f"Gagal: {result.get('error') or result.get('message')}"))