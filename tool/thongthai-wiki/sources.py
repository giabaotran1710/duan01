"""Các truy vấn Wikidata dùng để suy ra câu hỏi.

Mỗi nguồn trả về các dòng có:
  s, sL   : thực thể chủ đề và nhãn tiếng Việt
  sEn     : nhãn tiếng Anh (để ghi kèm khi nhãn Việt là bản dịch, ví dụ tên phim)
  sl      : số liên kết trang Wikipedia các ngôn ngữ (độ nổi tiếng, dùng để chia mức)
  o, oL   : đáp án (thực thể hoặc giá trị) và nhãn tiếng Việt
  y       : (tùy loại) năm đi kèm
Chỉ lấy thực thể có bài trên Wikipedia tiếng Việt (cả chủ đề lẫn đáp án là thực thể).
"""


def vi(var, article=True):
    s = f"?{var} rdfs:label ?{var}L FILTER(lang(?{var}L)='vi') "
    if article:
        s += f"?{var}A schema:about ?{var}; schema:isPartOf <https://vi.wikipedia.org/>. "
    return s


def en(var):
    return f"OPTIONAL{{?{var} rdfs:label ?{var}En FILTER(lang(?{var}En)='en')}} "


def rel(types, prop, minsl, extra='', obj_article=True, sub_article=True, path='wdt:P31'):
    vals = ' '.join('wd:' + t for t in types)
    return (f"SELECT ?s ?sL ?sEn ?sl ?o ?oL ?osl ?y ?o2 WHERE {{ VALUES ?t {{ {vals} }} "
            f"?s {path} ?t; wdt:{prop} ?o; wikibase:sitelinks ?sl. FILTER(?sl>={minsl}) "
            f"OPTIONAL{{?s wdt:{prop} ?o2 FILTER(?o2 != ?o)}} "
            f"OPTIONAL{{?o wikibase:sitelinks ?osl}} "
            + vi('s', sub_article) + vi('o', obj_article) + en('s') + extra + "}")


SOVEREIGN = 'Q3624078'
Y = lambda prop: f"OPTIONAL{{?s wdt:{prop} ?d BIND(YEAR(?d) AS ?y)}} "

SOURCES = {
    # --- Nghệ thuật, văn học ---
    'film_director': rel(['Q11424', 'Q24869', 'Q202866'], 'P57', 22, Y('P577')),
    'book_author': rel(['Q7725634', 'Q8261', 'Q571', 'Q25379', 'Q5185279', 'Q49084', 'Q1279564', 'Q12106333', 'Q37484', 'Q4294641'], 'P50', 12, Y('P577')),
    'painting_artist': rel(['Q3305213', 'Q93184', 'Q860861'], 'P170', 8, Y('P571')),
    'music_composer': rel(['Q1344', 'Q9734', 'Q2743', 'Q1792644', 'Q105543609', 'Q207628', 'Q7366', 'Q215380'], 'P86', 10),
    'building_architect': rel(['Q41176', 'Q811979', 'Q16970', 'Q2977', 'Q11303', 'Q570116', 'Q33506', 'Q12518', 'Q483110', 'Q24354', 'Q4989906', 'Q1440300', 'Q16560'], 'P84', 10),
    'band_country': rel(['Q215380', 'Q5741069', 'Q9212979'], 'P495', 25),
    'album_artist': rel(['Q482994'], 'P175', 30, Y('P577')),
    'tvseries_country': rel(['Q5398426'], 'P495', 35, Y('P580')),
    # --- Địa lý ---
    'city_country': rel(['Q515', 'Q1637706', 'Q200250', 'Q1549591', 'Q5119', 'Q15284', 'Q1093829', 'Q22865'], 'P17', 35),
    'country_capital': rel([SOVEREIGN], 'P36', 1),
    'country_currency': rel([SOVEREIGN], 'P38', 1),
    'country_continent': rel([SOVEREIGN], 'P30', 1),
    'country_highpoint': rel([SOVEREIGN], 'P610', 1),
    'country_language': rel([SOVEREIGN], 'P37', 1),
    'country_tld': ("SELECT ?s ?sL ?sEn ?sl ?o ?oL WHERE { ?s wdt:P31 wd:Q3624078; wdt:P78 ?t; wikibase:sitelinks ?sl. "
                    "?t rdfs:label ?oL FILTER(lang(?oL)='en') BIND(?t AS ?o) " + vi('s') + en('s') + "}"),
    'country_calling': ("SELECT ?s ?sL ?sEn ?sl ?o ?oL WHERE { ?s wdt:P31 wd:Q3624078; wdt:P474 ?o; wikibase:sitelinks ?sl. BIND(?o AS ?oL) "
                        + vi('s') + en('s') + "}"),
    'mountain_country': rel(['Q8502', 'Q8072', 'Q1595289', 'Q46831'], 'P17', 20),
    'river_mouth': rel(['Q4022'], 'P403', 20),
    'river_country': rel(['Q4022'], 'P17', 25),
    'lake_country': rel(['Q23397', 'Q211302'], 'P17', 18),
    'island_country': rel(['Q23442', 'Q1402592', 'Q33837'], 'P17', 18),
    'heritage_country': ("SELECT ?s ?sL ?sEn ?sl ?o ?oL ?osl ?y ?o2 WHERE { ?s wdt:P1435 wd:Q9259; wdt:P17 ?o; wikibase:sitelinks ?sl. OPTIONAL{?s wdt:P17 ?o2 FILTER(?o2 != ?o)} FILTER(?sl>=10) "
                         "OPTIONAL{?o wikibase:sitelinks ?osl} OPTIONAL{?s p:P1435 ?st. ?st ps:P1435 wd:Q9259; pq:P580 ?d BIND(YEAR(?d) AS ?y)} "
                         + vi('s') + vi('o') + en('s') + "}"),
    'sea_ocean': rel(['Q165', 'Q1322134', 'Q39594'], 'P4614', 15),
    'volcano_country': rel(['Q8072'], 'P17', 12),
    'desert_country': rel(['Q8514'], 'P17', 15),
    'university_country': rel(['Q3918', 'Q902104', 'Q875538'], 'P17', 40),
    'airport_city': rel(['Q1248784', 'Q644371'], 'P931', 30),
    'stadium_city': rel(['Q483110', 'Q1076486'], 'P131', 30),
    # --- Khoa học ---
    'moon_planet': ("SELECT ?s ?sL ?sEn ?sl ?o ?oL ?osl ?o2 WHERE { VALUES ?o {wd:Q2 wd:Q111 wd:Q319 wd:Q193 wd:Q324 wd:Q332 wd:Q339} ?s wdt:P397 ?o; wikibase:sitelinks ?sl. FILTER(?sl>=8) "
                    "OPTIONAL{?s wdt:P397 ?o2 FILTER(?o2 != ?o)} OPTIONAL{?o wikibase:sitelinks ?osl} " + vi('s') + vi('o') + en('s') + "}"),
    'star_constellation': rel(['Q523', 'Q5871', 'Q1153392', 'Q72803622', 'Q13890', 'Q66619666', 'Q1048372'], 'P59', 25),
    'element_symbol': ("SELECT ?s ?sL ?sEn ?sl ?o ?oL WHERE { ?s wdt:P31 wd:Q11344; wdt:P246 ?o; wikibase:sitelinks ?sl. BIND(?o AS ?oL) " + vi('s') + en('s') + "}"),
    'element_number': ("SELECT ?s ?sL ?sEn ?sl ?o ?oL WHERE { ?s wdt:P31 wd:Q11344; wdt:P1086 ?o; wikibase:sitelinks ?sl. BIND(STR(?o) AS ?oL) " + vi('s') + en('s') + "}"),
    'element_discoverer': rel(['Q11344'], 'P61', 1),
    'element_year': ("SELECT ?s ?sL ?sEn ?sl ?o ?oL WHERE { ?s wdt:P31 wd:Q11344; wdt:P575 ?d; wikibase:sitelinks ?sl. BIND(YEAR(?d) AS ?o) BIND(STR(YEAR(?d)) AS ?oL) " + vi('s') + en('s') + "}"),
    'disease_cause': rel(['Q12136', 'Q18123741', 'Q929833', 'Q112193867'], 'P828', 20),
    'species_family_animal': ("SELECT ?s ?sL ?sEn ?sl ?o ?oL ?osl WHERE { ?s wdt:P105 wd:Q7432; wdt:P171 ?g; wikibase:sitelinks ?sl. FILTER(?sl>=60) "
                              "?g wdt:P171 ?o. ?o wdt:P105 wd:Q35409. OPTIONAL{?o wikibase:sitelinks ?osl} " + vi('s') + vi('o') + en('s') + "}"),
    'genus_order': ("SELECT ?s ?sL ?sEn ?sl ?o ?oL ?osl WHERE { ?s wdt:P105 wd:Q35409; wdt:P171 ?f; wikibase:sitelinks ?sl. FILTER(?sl>=40) "
                    "?f wdt:P171 ?o. ?o wdt:P105 wd:Q36602. OPTIONAL{?o wikibase:sitelinks ?osl} " + vi('s') + vi('o') + en('s') + "}"),
    'unit_namedafter': rel(['Q223662', 'Q208469', 'Q1978718', 'Q61610698'], 'P138', 5),
    'law_namedafter': rel(['Q408891', 'Q11538', 'Q65943', 'Q1967417', 'Q1321905'], 'P138', 12),
    'invention_inventor': rel(['Q39546', 'Q1183543', 'Q3966', 'Q42889', 'Q11019', 'Q1371849'], 'P61', 15),
    'mineral_formula': ("SELECT ?s ?sL ?sEn ?sl ?o ?oL WHERE { VALUES ?t {wd:Q11173 wd:Q12140 wd:Q113145171} ?s wdt:P31 ?t; wdt:P274 ?o; wikibase:sitelinks ?sl. FILTER(?sl>=50) BIND(?o AS ?oL) " + vi('s') + en('s') + "}"),
    'spacecraft_operator': rel(['Q40218', 'Q26529', 'Q2133344', 'Q5916', 'Q697175', 'Q752783'], 'P137', 15, Y('P619')),
    # --- Lịch sử ---
    'battle_year': ("SELECT ?s ?sL ?sEn ?sl ?o ?oL WHERE { VALUES ?t {wd:Q178561 wd:Q188055 wd:Q831663 wd:Q645883} ?s wdt:P31 ?t; wikibase:sitelinks ?sl. FILTER(?sl>=15) "
                    "{?s wdt:P585 ?d} UNION {?s wdt:P580 ?d} BIND(YEAR(?d) AS ?o) BIND(STR(YEAR(?d)) AS ?oL) " + vi('s') + en('s') + "}"),
    'battle_war': rel(['Q178561', 'Q188055', 'Q831663', 'Q645883'], 'P361', 15),
    'war_year': ("SELECT ?s ?sL ?sEn ?sl ?o ?oL WHERE { VALUES ?t {wd:Q198 wd:Q8465 wd:Q103495 wd:Q1006311 wd:Q467011 wd:Q10931 wd:Q124734} ?s wdt:P31 ?t; wikibase:sitelinks ?sl. FILTER(?sl>=20) "
                 "?s wdt:P580 ?d. BIND(YEAR(?d) AS ?o) BIND(STR(YEAR(?d)) AS ?oL) " + vi('s') + en('s') + "}"),
    'treaty_year': ("SELECT ?s ?sL ?sEn ?sl ?o ?oL WHERE { VALUES ?t {wd:Q131569 wd:Q625298 wd:Q864737 wd:Q1440055} ?s wdt:P31 ?t; wikibase:sitelinks ?sl. FILTER(?sl>=10) "
                    "{?s wdt:P585 ?d} UNION {?s wdt:P571 ?d} UNION {?s wdt:P580 ?d} BIND(YEAR(?d) AS ?o) BIND(STR(YEAR(?d)) AS ?oL) " + vi('s') + en('s') + "}"),
    'dynasty_founder': rel(['Q164950', 'Q48349', 'Q1307214'], 'P112', 8),
    'dynasty_start': ("SELECT ?s ?sL ?sEn ?sl ?o ?oL WHERE { VALUES ?t {wd:Q164950 wd:Q48349} ?s wdt:P31 ?t; wikibase:sitelinks ?sl. FILTER(?sl>=8) "
                      "?s wdt:P571 ?d. BIND(YEAR(?d) AS ?o) BIND(STR(YEAR(?d)) AS ?oL) " + vi('s') + en('s') + "}"),
    'empire_capital': rel(['Q3024240', 'Q48349', 'Q417175', 'Q1250464', 'Q164950'], 'P36', 15),
    'monarch_dynasty': ("SELECT ?s ?sL ?sEn ?sl ?o ?oL ?osl ?o2 WHERE { ?s wdt:P31 wd:Q5; wdt:P53 ?o; wikibase:sitelinks ?sl. OPTIONAL{?s wdt:P53 ?o2 FILTER(?o2 != ?o)} FILTER(?sl>=20) "
                        "?o wdt:P31/wdt:P279* wd:Q164950. OPTIONAL{?o wikibase:sitelinks ?osl} " + vi('s') + vi('o') + en('s') + "}"),
    'event_year': ("SELECT ?s ?sL ?sEn ?sl ?o ?oL WHERE { VALUES ?t {wd:Q10931 wd:Q2223653 wd:Q3839081 wd:Q7944 wd:Q8065 wd:Q1190554 wd:Q5389 wd:Q159821 wd:Q82414 wd:Q46970 wd:Q12737077 wd:Q3002772} ?s wdt:P31 ?t; wikibase:sitelinks ?sl. FILTER(?sl>=25) "
                   "{?s wdt:P585 ?d} UNION {?s wdt:P580 ?d} BIND(YEAR(?d) AS ?o) BIND(STR(YEAR(?d)) AS ?oL) " + vi('s') + en('s') + "}"),
    'olympics_city': rel(['Q159821', 'Q82414', 'Q2363385'], 'P276', 1),
    'worldcup_host': rel(['Q19317', 'Q10891'], 'P17', 1),
    'worldcup_winner': rel(['Q19317', 'Q10891'], 'P1346', 1),
    # --- Con người ---
    'person_birthplace': ("SELECT ?s ?sL ?sEn ?sl ?o ?oL ?osl ?o2 WHERE { ?s wdt:P31 wd:Q5; wdt:P19 ?o; wikibase:sitelinks ?sl. OPTIONAL{?s wdt:P19 ?o2 FILTER(?o2 != ?o)} FILTER(?sl>=70) "
                          "OPTIONAL{?o wikibase:sitelinks ?osl} " + vi('s') + vi('o') + en('s') + "}"),
    'person_birthyear': ("SELECT ?s ?sL ?sEn ?sl ?o ?oL WHERE { ?s wdt:P31 wd:Q5; wdt:P569 ?d; wikibase:sitelinks ?sl. FILTER(?sl>=110) "
                         "BIND(YEAR(?d) AS ?o) BIND(STR(YEAR(?d)) AS ?oL) " + vi('s') + en('s') + "}"),
    'person_deathyear': ("SELECT ?s ?sL ?sEn ?sl ?o ?oL WHERE { ?s wdt:P31 wd:Q5; wdt:P570 ?d; wikibase:sitelinks ?sl. FILTER(?sl>=110) "
                         "BIND(YEAR(?d) AS ?o) BIND(STR(YEAR(?d)) AS ?oL) " + vi('s') + en('s') + "}"),
    'person_citizenship': ("SELECT ?s ?sL ?sEn ?sl ?o ?oL ?osl WHERE { ?s wdt:P31 wd:Q5; wdt:P27 ?o; wikibase:sitelinks ?sl. FILTER(?sl>=45) "
                           "?o wdt:P31 wd:Q3624078. OPTIONAL{?o wikibase:sitelinks ?osl} " + vi('s') + vi('o') + en('s') + "}"),
    'person_notablework': ("SELECT ?s ?sL ?sEn ?sl ?o ?oL ?osl WHERE { ?s wdt:P31 wd:Q5; wdt:P800 ?o; wikibase:sitelinks ?sl. FILTER(?sl>=40) "
                           "OPTIONAL{?o wikibase:sitelinks ?osl} " + vi('s') + vi('o') + en('s') + "}"),
    'person_spouse': ("SELECT ?s ?sL ?sEn ?sl ?o ?oL ?osl WHERE { ?s wdt:P31 wd:Q5; wdt:P26 ?o; wikibase:sitelinks ?sl. FILTER(?sl>=60) "
                      "OPTIONAL{?o wikibase:sitelinks ?osl} " + vi('s') + vi('o') + en('s') + "}"),
    'person_father': ("SELECT ?s ?sL ?sEn ?sl ?o ?oL ?osl ?o2 WHERE { ?s wdt:P31 wd:Q5; wdt:P22 ?o; wikibase:sitelinks ?sl. OPTIONAL{?s wdt:P22 ?o2 FILTER(?o2 != ?o)} FILTER(?sl>=30) "
                      "OPTIONAL{?o wikibase:sitelinks ?osl} " + vi('s') + vi('o') + en('s') + "}"),
    'person_sport': ("SELECT ?s ?sL ?sEn ?sl ?o ?oL ?osl ?o2 WHERE { ?s wdt:P31 wd:Q5; wdt:P641 ?o; wikibase:sitelinks ?sl. OPTIONAL{?s wdt:P641 ?o2 FILTER(?o2 != ?o)} FILTER(?sl>=50) "
                     "OPTIONAL{?o wikibase:sitelinks ?osl} " + vi('s') + vi('o') + en('s') + "}"),
    'person_instrument': ("SELECT ?s ?sL ?sEn ?sl ?o ?oL ?osl WHERE { ?s wdt:P31 wd:Q5; wdt:P1303 ?o; wikibase:sitelinks ?sl. FILTER(?sl>=40) "
                          "OPTIONAL{?o wikibase:sitelinks ?osl} " + vi('s') + vi('o') + en('s') + "}"),
    'nobel': ("SELECT ?s ?sL ?sEn ?sl ?o ?oL ?y WHERE { VALUES ?o {wd:Q38104 wd:Q44585 wd:Q80061 wd:Q37922 wd:Q35637 wd:Q47170} "
              "?s p:P166 ?st. ?st ps:P166 ?o; pq:P585 ?d. BIND(YEAR(?d) AS ?y) ?s wikibase:sitelinks ?sl. "
              + vi('s') + vi('o', False) + en('s') + "}"),
    # --- Đời sống, thể thao, công nghệ ---
    'food_origin': rel(['Q746549', 'Q2095', 'Q19861951', 'Q1778821', 'Q13266', 'Q40050', 'Q3314483', 'Q1047113', 'Q178'], 'P495', 15),
    'drink_origin': rel(['Q40050', 'Q154', 'Q282', 'Q10611', 'Q44', 'Q56139', 'Q1501'], 'P495', 15),
    'dogbreed_origin': rel(['Q39367', 'Q43577'], 'P495', 15),
    'sport_origin': rel(['Q349', 'Q31629', 'Q216048', 'Q2312410'], 'P495', 20),
    'instrument_origin': rel(['Q34379', 'Q1798603', 'Q1254773'], 'P495', 15),
    'company_founder': rel(['Q4830453', 'Q891723', 'Q6881511', 'Q783794', 'Q210167', 'Q1058914', 'Q431289', 'Q167270'], 'P112', 40),
    'company_country': rel(['Q4830453', 'Q891723', 'Q6881511', 'Q783794', 'Q210167', 'Q1058914', 'Q786820', 'Q167270'], 'P17', 45),
    'carbrand_country': rel(['Q786820', 'Q936518', 'Q42889', 'Q3041792'], 'P17', 25),
    'company_year': ("SELECT ?s ?sL ?sEn ?sl ?o ?oL WHERE { VALUES ?t {wd:Q4830453 wd:Q891723 wd:Q6881511 wd:Q783794 wd:Q786820 wd:Q210167 wd:Q1058914} ?s wdt:P31 ?t; wdt:P571 ?d; wikibase:sitelinks ?sl. FILTER(?sl>=60) "
                     "BIND(YEAR(?d) AS ?o) BIND(STR(YEAR(?d)) AS ?oL) " + vi('s') + en('s') + "}"),
    'proglang_designer': rel(['Q9143', 'Q12772052', 'Q28922885', 'Q21562092', 'Q899523'], 'P287', 10),
    'proglang_year': ("SELECT ?s ?sL ?sEn ?sl ?o ?oL WHERE { VALUES ?t {wd:Q9143 wd:Q12772052 wd:Q28922885 wd:Q21562092 wd:Q899523} ?s wdt:P31 ?t; wdt:P571 ?d; wikibase:sitelinks ?sl. FILTER(?sl>=20) "
                      "BIND(YEAR(?d) AS ?o) BIND(STR(YEAR(?d)) AS ?oL) " + vi('s') + en('s') + "}"),
    'software_developer': rel(['Q7397', 'Q9135', 'Q166142', 'Q6368', 'Q1130645', 'Q218616', 'Q7889', 'Q341', 'Q2122005'], 'P178', 30),
    'club_country': rel(['Q476028', 'Q1194951', 'Q103229495'], 'P17', 40),
    'club_city': rel(['Q476028'], 'P159', 45),
    'festival_country': rel(['Q1445650', 'Q15275719', 'Q868557', 'Q1322323', 'Q375011'], 'P17', 20),
    'religion_founder': rel(['Q9174', 'Q879146', 'Q13414953', 'Q1530022', 'Q71966', 'Q9134'], 'P112', 15),
    'deity_mythology': ("SELECT ?s ?sL ?sEn ?sl ?o ?oL ?osl WHERE { VALUES ?t {wd:Q22989102 wd:Q178885 wd:Q16513881 wd:Q4271324 wd:Q24334685 wd:Q20643955 wd:Q1631734} ?s wdt:P31 ?t; wikibase:sitelinks ?sl. FILTER(?sl>=25) "
                        "BIND(?t AS ?o) OPTIONAL{?o wikibase:sitelinks ?osl} " + vi('s') + vi('o', False) + en('s') + "}"),
}

SOURCES['country_border'] = ("SELECT ?s ?sL ?sEn ?sl ?o ?oL WHERE { ?s wdt:P31 wd:Q3624078; wdt:P47 ?o; wikibase:sitelinks ?sl. "
                             "?o wdt:P31 wd:Q3624078. ?o rdfs:label ?oL FILTER(lang(?oL)='vi') " + vi('s') + en('s') + "}")
