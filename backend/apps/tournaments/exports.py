import csv
import io

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from apps.players.models import Player


def _teams_with_squads(tournament):
    return tournament.teams.prefetch_related('players').order_by('name')


def _unsold_players(tournament):
    return tournament.players.filter(status=Player.Status.UNSOLD).select_related('position').order_by('name')


def build_results_csv(tournament) -> str:
    buf = io.StringIO()
    writer = csv.writer(buf)

    writer.writerow(['Team Squads'])
    writer.writerow(['Team', 'Player', 'Position', 'Sold Price'])
    for team in _teams_with_squads(tournament):
        sold_players = team.players.filter(status=Player.Status.SOLD).select_related('position').order_by('name')
        if not sold_players:
            writer.writerow([team.name, '(no players won)', '', ''])
        for player in sold_players:
            writer.writerow([team.name, player.name, player.position.name if player.position else '', player.sold_price])
    writer.writerow([])

    writer.writerow(['Spend Summary'])
    writer.writerow(['Team', 'Budget Total', 'Budget Spent', 'Budget Remaining', 'Squad Size'])
    for team in _teams_with_squads(tournament):
        writer.writerow([team.name, team.budget_total, team.budget_spent, team.budget_remaining, team.squad_size])
    writer.writerow([])

    writer.writerow(['Unsold Players'])
    writer.writerow(['Player', 'Position', 'Base Price'])
    for player in _unsold_players(tournament):
        writer.writerow([player.name, player.position.name if player.position else '', player.base_price])

    return buf.getvalue()


def build_results_pdf(tournament) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=1.5 * cm, bottomMargin=1.5 * cm)
    styles = getSampleStyleSheet()
    story = [Paragraph(f'{tournament.name} — Final Results', styles['Title']), Spacer(1, 0.5 * cm)]

    table_style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e293b')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f1f5f9')]),
    ])

    story.append(Paragraph('Team Squads', styles['Heading2']))
    for team in _teams_with_squads(tournament):
        story.append(Paragraph(f'{team.name} — {team.squad_size} player(s)', styles['Heading3']))
        sold_players = team.players.filter(status=Player.Status.SOLD).select_related('position').order_by('name')
        rows = [['Player', 'Position', 'Sold Price']]
        if sold_players:
            rows += [[p.name, p.position.name if p.position else '—', str(p.sold_price)] for p in sold_players]
        else:
            rows.append(['(no players won)', '', ''])
        table = Table(rows, colWidths=[7 * cm, 5 * cm, 4 * cm])
        table.setStyle(table_style)
        story.append(table)
        story.append(Spacer(1, 0.4 * cm))

    story.append(Paragraph('Spend Summary', styles['Heading2']))
    rows = [['Team', 'Budget Total', 'Budget Spent', 'Budget Remaining', 'Squad Size']]
    rows += [
        [team.name, str(team.budget_total), str(team.budget_spent), str(team.budget_remaining), str(team.squad_size)]
        for team in _teams_with_squads(tournament)
    ]
    table = Table(rows, colWidths=[5 * cm, 3.5 * cm, 3.5 * cm, 3.5 * cm, 2.5 * cm])
    table.setStyle(table_style)
    story.append(table)
    story.append(Spacer(1, 0.6 * cm))

    story.append(Paragraph('Unsold Players', styles['Heading2']))
    unsold = list(_unsold_players(tournament))
    rows = [['Player', 'Position', 'Base Price']]
    if unsold:
        rows += [[p.name, p.position.name if p.position else '—', str(p.base_price)] for p in unsold]
    else:
        rows.append(['(none)', '', ''])
    table = Table(rows, colWidths=[7 * cm, 5 * cm, 4 * cm])
    table.setStyle(table_style)
    story.append(table)

    doc.build(story)
    return buf.getvalue()
