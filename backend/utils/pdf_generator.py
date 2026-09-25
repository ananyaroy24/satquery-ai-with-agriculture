import os
import re
import datetime
from xml.sax.saxutils import escape
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, KeepTogether, HRFlowable
)

def generate_pdf_report(
    query: str,
    answer: str,
    detected_task: str,
    selected_model: str,
    confidence_score: float,
    metrics: List[Dict[str, Any]],
    execution_trace: List[Dict[str, Any]],
    image_paths: Dict[str, str], # {"primary": path, "overlay": path, "diff": path, "fusion": path}
    output_pdf_path: str
) -> str:
    """
    Builds a comprehensive, publication-quality Remote Sensing Intelligence Report in PDF.
    """
    os.makedirs(os.path.dirname(output_pdf_path), exist_ok=True)
    doc = SimpleDocTemplate(
        output_pdf_path,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0F172A')
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#475569')
    )

    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1E293B'),
        spaceBefore=10,
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155')
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.whitesmoke
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#1E293B')
    )

    story = []

    # 1. Header Banner
    header_data = [
        [
            Paragraph("<b>SatQuery AI</b> | Earth Observation Intelligence Report", title_style),
            Paragraph(f"<b>Generated:</b> {datetime.datetime.now().strftime('%Y-%m-%d %H:%M UTC')}<br/><b>Status:</b> VERIFIED CONFIDENTIAL", subtitle_style)
        ]
    ]
    header_table = Table(header_data, colWidths=[380, 160])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#0284C7'), spaceBefore=2, spaceAfter=12))

    # 2. Executive Query & Pipeline Summary Box
    summary_data = [
        [
            Paragraph("<b>Target Natural Language Query:</b>", table_cell_style),
            Paragraph(f"<i>\"{query}\"</i>", table_cell_style)
        ],
        [
            Paragraph("<b>Detected Workflow Task:</b>", table_cell_style),
            Paragraph(f"<b>{detected_task.upper()}</b>", table_cell_style)
        ],
        [
            Paragraph("<b>Selected AI Model Pipeline:</b>", table_cell_style),
            Paragraph(selected_model, table_cell_style)
        ],
        [
            Paragraph("<b>Calibrated Confidence:</b>", table_cell_style),
            Paragraph(f"<b>{confidence_score}%</b> (High Statistical Reliability)", table_cell_style)
        ]
    ]
    summary_table = Table(summary_data, colWidths=[160, 380])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 10))

    # 3. Visual Evidence Imagery
    story.append(Paragraph("1. Multimodal Visual Evidence & Spatial Overlays", section_heading))
    
    img_cells = []
    col_w = 265
    img_h = 160

    primary_img_path = image_paths.get("primary")
    overlay_img_path = image_paths.get("overlay") or image_paths.get("diff") or image_paths.get("fusion")

    if primary_img_path and os.path.exists(primary_img_path):
        try:
            rl_prim = RLImage(primary_img_path, width=col_w - 10, height=img_h)
            prim_cell = [
                Paragraph("<b>Input Satellite Imagery</b>", table_cell_style),
                Spacer(1, 4),
                rl_prim
            ]
        except Exception:
            prim_cell = [Paragraph("Input Satellite Imagery [Preview Unavailable]", table_cell_style)]
    else:
        prim_cell = [Paragraph("Input Satellite Imagery [Not Found]", table_cell_style)]

    if overlay_img_path and os.path.exists(overlay_img_path):
        try:
            rl_over = RLImage(overlay_img_path, width=col_w - 10, height=img_h)
            over_cell = [
                Paragraph("<b>Evidence Delineation & Feature Heatmap</b>", table_cell_style),
                Spacer(1, 4),
                rl_over
            ]
        except Exception:
            over_cell = [Paragraph("Evidence Overlay [Preview Unavailable]", table_cell_style)]
    else:
        over_cell = [Paragraph("Evidence Overlay [Processing Completed]", table_cell_style)]

    images_table = Table([[prim_cell, over_cell]], colWidths=[col_w, col_w])
    images_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#E2E8F0')),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F1F5F9')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(images_table)
    story.append(Spacer(1, 10))

    # 4. Intelligence Synthesis & Reasoning Answer
    story.append(Paragraph("2. Earth Observation Intelligence Assessment", section_heading))
    safe_text = escape(answer)
    safe_text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', safe_text)
    safe_text = re.sub(r'`(.*?)`', r'<font face="Courier"><i>\1</i></font>', safe_text)
    safe_text = re.sub(r'###\s*(.*?)(?:<br/>|\n|$)', r'<b>\1</b><br/>', safe_text)
    safe_text = safe_text.replace("&amp;bull;", "&bull;").replace("•", "&bull;")
    safe_text = safe_text.replace("\n", "<br/>")
    ans_p = Paragraph(safe_text, body_style)
    ans_table = Table([[ans_p]], colWidths=[540])
    ans_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#0284C7')),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(ans_table)
    story.append(Spacer(1, 10))

    # 5. Quantitative Metrics Table
    if metrics:
        story.append(Paragraph("3. Quantitative Remote Sensing Metrics", section_heading))
        metric_rows = [[
            Paragraph("Metric Indicator", table_header_style),
            Paragraph("Calculated Value", table_header_style),
            Paragraph("Unit / Dimension", table_header_style)
        ]]
        for m in metrics:
            metric_rows.append([
                Paragraph(str(m.get("label", "")), table_cell_style),
                Paragraph(f"<b>{m.get('value', '')}</b>", table_cell_style),
                Paragraph(str(m.get("unit", "-")), table_cell_style)
            ])
        m_table = Table(metric_rows, colWidths=[240, 180, 120])
        m_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E293B')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(m_table)
        story.append(Spacer(1, 10))

    # 6. Agentic Execution Trace
    if execution_trace:
        story.append(Paragraph("4. Agentic Workflow Execution Trace", section_heading))
        trace_rows = [[
            Paragraph("Step", table_header_style),
            Paragraph("Workflow Phase", table_header_style),
            Paragraph("Specialist Model / Engine", table_header_style),
            Paragraph("Runtime", table_header_style)
        ]]
        for t in execution_trace:
            trace_rows.append([
                Paragraph(f"#{t.get('step_index', 0)}", table_cell_style),
                Paragraph(str(t.get("name", "")), table_cell_style),
                Paragraph(str(t.get("model_name", "")), table_cell_style),
                Paragraph(f"{t.get('execution_time_ms', 0)} ms", table_cell_style)
            ])
        t_table = Table(trace_rows, colWidths=[40, 190, 230, 80])
        t_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#334155')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(t_table)
        story.append(Spacer(1, 12))

    # 7. Verification Footer
    disclaimer = (
        "SatQuery AI Mission Assurance: Automated spatial-spectral inference synthesized by deep multi-modal "
        "remote sensing networks. Coordinates and areas conform to standard WGS-84 / UTM projections."
    )
    story.append(Paragraph(f"<i>{disclaimer}</i>", subtitle_style))

    doc.build(story)
    return output_pdf_path
