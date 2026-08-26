from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('tournaments', '0007_migrate_sponsor_logo_data'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='tournament',
            name='theme_sponsor_logo',
        ),
    ]
