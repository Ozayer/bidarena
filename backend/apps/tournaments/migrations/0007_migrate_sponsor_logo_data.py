from django.db import migrations


def copy_sponsor_logos(apps, schema_editor):
    Tournament = apps.get_model('tournaments', 'Tournament')
    TournamentSponsorLogo = apps.get_model('tournaments', 'TournamentSponsorLogo')
    for tournament in Tournament.objects.exclude(theme_sponsor_logo='').exclude(theme_sponsor_logo__isnull=True):
        TournamentSponsorLogo.objects.create(tournament=tournament, image=tournament.theme_sponsor_logo, order=0)


def restore_first_sponsor_logo(apps, schema_editor):
    Tournament = apps.get_model('tournaments', 'Tournament')
    TournamentSponsorLogo = apps.get_model('tournaments', 'TournamentSponsorLogo')
    for tournament in Tournament.objects.all():
        first = TournamentSponsorLogo.objects.filter(tournament=tournament).order_by('order', 'id').first()
        if first:
            tournament.theme_sponsor_logo = first.image
            tournament.save(update_fields=['theme_sponsor_logo'])


class Migration(migrations.Migration):

    dependencies = [
        ('tournaments', '0006_tournament_sponsor_logo'),
    ]

    operations = [
        migrations.RunPython(copy_sponsor_logos, restore_first_sponsor_logo),
    ]
