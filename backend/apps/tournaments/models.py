from django.conf import settings
from django.db import models
from django.utils.text import slugify


class Tournament(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        SETUP = 'setup', 'Setup'
        LIVE = 'live', 'Live'
        COMPLETED = 'completed', 'Completed'

    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    description = models.TextField(blank=True)
    cover_photo = models.ImageField(upload_to='tournaments/covers/', blank=True, null=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    num_teams = models.PositiveIntegerField(default=0)
    players_per_team_min = models.PositiveIntegerField(
        default=1, help_text='Minimum squad size a team must reach for a complete roster'
    )
    players_per_team_max = models.PositiveIntegerField(
        default=20, help_text='Maximum squad size a team can build'
    )
    default_team_budget = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    bid_timer_seconds = models.PositiveIntegerField(
        default=15, help_text='Countdown per player, resets on each new bid'
    )
    bid_timer_extend_seconds = models.PositiveIntegerField(
        default=15, help_text='Seconds added when admin manually extends the timer'
    )
    bid_cooldown_seconds = models.PositiveIntegerField(
        default=3,
        help_text=(
            'Short freeze after each bid before another bid can land, so everyone has time to '
            'register the new price. Set to 0 to disable.'
        ),
    )
    result_display_seconds = models.PositiveIntegerField(
        default=6,
        help_text=(
            'How long the big-screen display shows the sold/unsold result (player, team, price) '
            'before switching to "waiting for next player". Ends early if the next player starts first.'
        ),
    )

    public_guest_link_enabled = models.BooleanField(default=True)

    themed_display_enabled = models.BooleanField(
        default=False,
        help_text='Show a branded big-screen display (with the logos below) instead of the generic one.',
    )
    theme_primary_logo = models.ImageField(upload_to='tournaments/theme/', blank=True, null=True)
    theme_club_logo = models.ImageField(upload_to='tournaments/theme/', blank=True, null=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='tournaments_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class TournamentSponsorLogo(models.Model):
    """One of possibly several sponsor logos shown on the branded big-screen display."""

    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='sponsor_logos')
    image = models.ImageField(upload_to='tournaments/theme/sponsors/')
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f'Sponsor logo for {self.tournament.name} (#{self.order})'


class Position(models.Model):
    """A sport-agnostic player category/role, e.g. Defender, Batsman."""

    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='positions')
    name = models.CharField(max_length=100)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'name']
        unique_together = ('tournament', 'name')

    def __str__(self):
        return f'{self.name} ({self.tournament.name})'


class BidIncrementRule(models.Model):
    """Tiered auto-increment: bids in [from_amount, to_amount) increase by increment_amount."""

    tournament = models.ForeignKey(
        Tournament, on_delete=models.CASCADE, related_name='increment_rules'
    )
    from_amount = models.DecimalField(max_digits=12, decimal_places=2)
    to_amount = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text="Leave blank for 'and above'",
    )
    increment_amount = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        ordering = ['from_amount']

    def __str__(self):
        upper = self.to_amount if self.to_amount is not None else '∞'
        return f'{self.tournament.name}: {self.from_amount}-{upper} -> +{self.increment_amount}'
