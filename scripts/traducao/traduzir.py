"""Tradução para português do Brasil dos textos do mapa.

Regra: traduz tudo o que é descritivo ou genérico; nomes próprios (estabelecimentos, marcas, carros, armas
com modelo, cartas, revistas, corridas, bairros, ilhas) ficam como estão.

- descricoes.json: descrições inteiras (EN -> PT) e trechos repetidos separados por "; ".
- este arquivo: tipos, nomes genéricos, regras de nomes, condados e nomes geográficos.
Quando a fonte ganha pontos novos, o que não estiver aqui continua em inglês e o build_data.py avisa.
"""
import json
import re
from pathlib import Path

_D = json.loads((Path(__file__).parent / "descricoes.json").read_text())
COMPLETO, SEGMENTOS = _D["completo"], _D["segmentos"]

# ------------------------------------------------------------------ tipos (campo "t")
TIPOS = {
    "Bus stop": "Ponto de ônibus", "Under the bridge": "Sob a ponte", "Random event": "Evento aleatório",
    "Standout vehicle": "Veículo especial", "ATM": "Caixa eletrônico", "Street food": "Comida de rua", "Bar": "Bar",
    "Stunt jump": "Salto acrobático", "Café and takeout": "Café e comida para viagem", "Cafe Takeout": "Café e comida para viagem",
    "Basketball hoop": "Cesta de basquete", "Towable ATM": "Caixa eletrônico rebocável", "EV charger": "Carregador de carro elétrico",
    "Yellow Loot Box": "Caixa de saque amarela", "Hidden package": "Pacote escondido", "Magazine": "Revista",
    "Convenience store": "Loja de conveniência", "Clothes shop": "Loja de roupas", "Weapon pickup": "Arma no mapa",
    "Safe": "Cofre", "Gas station": "Posto de gasolina", "Race": "Corrida", "Unique Weapon": "Arma única",
    "Meteorite": "Meteorito", "Ahol Street Art": "Arte de rua Ahol", "Landmark": "Ponto turístico",
    "Drone race": "Corrida de drone", "WAiNK curiosity": "Curiosidade WAiNK", "Gang operation": "Operação de gangue",
    "Gang Operation": "Operação de gangue", "Knife flight": "Voo rasante", "Fishing spot": "Ponto de pesca",
    "Smash 'n' Grab": "Smash 'n' Grab", "Food and drink": "Comida e bebida", "Station": "Estação", "Arcade": "Fliperama",
    "WAiNK landmark": "Ponto turístico WAiNK", "BASE jump": "BASE jump", "Ammu-Nation": "Ammu-Nation",
    "WAiNK sculpture": "Escultura WAiNK", "Bank": "Banco", "Pay 'n' Spray": "Pay 'n' Spray",
    "Hair salon": "Salão de cabeleireiro", "Fire station": "Quartel de bombeiros", "Shoe shop": "Loja de calçados",
    "Collectible card": "Carta colecionável", "Pool": "Sinuca", "Vehicle request": "Pedido de veículo",
    "Police station": "Delegacia", "Marina": "Marina", "Electronics": "Eletrônicos", "Shooting range": "Estande de tiro",
    "Mod shop": "Oficina de personalização", "Garage": "Garagem", "Liquor store": "Loja de bebidas", "Fence": "Receptador",
    "Tattoo parlour": "Estúdio de tatuagem", "Airport": "Aeroporto", "Vehicle spawn": "Veículo no mapa",
    "City / Town": "Cidade", "Meditation spot": "Ponto de meditação", "Gym": "Academia", "Luxury Watch": "Relógio de luxo",
    "Payday loan": "Empréstimo rápido", "Book swap": "Troca de livros", "Unique playlist": "Playlist única",
    "Parachuting": "Paraquedismo", "Hunting": "Caça", "Helipad": "Heliponto", "helipad": "Heliponto", "Hospital": "Hospital",
    "Car wash": "Lava-rápido", "Message in a bottle": "Mensagem na garrafa", "Scoop Container": "Contêiner SCOOP",
    "Safehouse": "Esconderijo", "Nightclub": "Boate", "Treasure": "Tesouro", "1010 mural": "Mural 1010", "Golf": "Golfe",
    "Mini golf": "Minigolfe", "Vehicle rental": "Aluguel de veículos", "Comics": "Quadrinhos", "Comic": "Quadrinhos",
    "Gang compound": "Complexo de gangue", "Ferry": "Balsa", "Cinema": "Cinema", "Car Meet": "Encontro de carros",
    "Americas Next Top Hooker card": "Carta America's Next Top Hooker", "Jack Of Hearts card": "Carta Jack of Hearts",
    "Legends Of Ratface card": "Carta Legends of Ratface",
}

# ------------------------------------------------------------------ nomes genéricos exatos
NOMES = {
    # comércio, serviços, transporte
    "ATM": "Caixa eletrônico", "Towable ATM": "Caixa eletrônico rebocável", "Electric Vehicle Charger": "Carregador de carro elétrico",
    "Supermarket": "Supermercado", "Scuba Gear": "Equipamento de mergulho", "Mod shop": "Oficina de personalização",
    "Hair salon": "Salão de cabeleireiro", "Gas Station": "Posto de gasolina", "Street Food Vendor": "Vendedor de comida de rua",
    "Cafe": "Café", "Produce Stall": "Barraca de hortifrúti", "Boiled Peanuts Stand": "Barraca de amendoim cozido",
    "Street vendor": "Ambulante", "Food": "Comida", "Juice Stall": "Barraca de sucos", "Refreshments Stand": "Barraca de bebidas",
    "Bus Stop": "Ponto de ônibus", "Metro Station": "Estação de metrô", "Lock": "Eclusa", "Parking Lot": "Estacionamento",
    "Railyard": "Pátio ferroviário", "Bridge": "Ponte", "Train Bridge": "Ponte ferroviária", "Train Tunnel": "Túnel ferroviário",
    "Liquor Store": "Loja de bebidas", "Fence": "Receptador", "Pawn Shop": "Casa de penhores", "Car Park": "Estacionamento",
    "Pharmacy": "Farmácia", "Copyshop": "Copiadora", "Factory": "Fábrica", "Refinery": "Refinaria", "Silo": "Silo",
    "Sugar Fields": "Canaviais", "Sugar Mill": "Usina de açúcar", "Trailer Park": "Parque de trailers", "Strip Mall": "Centro comercial",
    "Port": "Porto", "Pier": "Píer", "Berth": "Atracadouro", "Breakwater": "Quebra-mar", "Dry Dock": "Doca seca",
    "Boat Ramp": "Rampa de barcos", "Bus Loop": "Retorno de ônibus", "Golf Carts": "Carrinhos de golfe", "Hangars": "Hangares",
    "Guardhouse": "Guarita", "Gate Building": "Prédio da portaria", "Service Gate": "Portão de serviço", "Empty Lot": "Terreno baldio",
    "Excavator Parking Lot": "Estacionamento das escavadeiras", "Electrical": "Instalação elétrica", "Stage": "Palco",
    "Beach Volleyball": "Vôlei de praia", "Covered Grandstands": "Arquibancadas cobertas", "Intersection": "Cruzamento",
    "Tunnel Entrance": "Entrada do túnel", "Riverbank": "Margem do rio", "Welcome Sign": "Placa de boas-vindas",
    "Yellow House": "Casa amarela", "White House": "Casa branca", "Big House": "Casarão", "Cave": "Caverna", "Dam": "Barragem",
    "Sculpture": "Escultura", "Lighthouse": "Farol", "Fire Station": "Quartel de bombeiros",
    # construções e lugares
    "Construction Site": "Canteiro de obras", "Park": "Parque", "Lake": "Lago", "Warehouse": "Galpão", "Tank": "Tanque",
    "Lifeguard Tower": "Posto de salva-vidas", "Guard Booth": "Guarita", "Parking Garage": "Edifício-garagem", "Church": "Igreja",
    "Water Tank": "Caixa d'água", "Water Tower": "Caixa d'água", "Runway": "Pista do aeroporto", "River": "Rio",
    "Electric Substation": "Subestação elétrica", "Interchange": "Trevo", "Tunnel": "Túnel", "Footbridge": "Passarela",
    "Grandstands": "Arquibancadas", "Naval Air Station": "Estação aeronaval", "Canal": "Canal", "Cove": "Enseada",
    "Peninsula": "Península", "Waterfall": "Cachoeira", "Sandbars": "Bancos de areia", "Turn": "Curva",
    "Repair & Salvage": "Consertos e sucata", "Dilapidated Spy Ship": "Navio espião em ruínas",
    "Vice City Ferris Wheel": "Roda-gigante de Vice City", "Vice City Sign": "Letreiro de Vice City",
    "Vice City International Airport": "Aeroporto Internacional de Vice City", "Vice Museum of Art": "Museu de Arte de Vice",
    "Vice City Hall": "Prefeitura de Vice City", "Key Lento Sign": "Placa de Key Lento",
    "Welcome to Hamlet\" Sign": "Placa \"Welcome to Hamlet\"", "Welcome to Port Gellhorn Sign": "Placa \"Welcome to Port Gellhorn\"",
    "Welcome to The Keys\" Sign": "Placa \"Welcome to The Keys\"", "Starlet Motel Sign": "Letreiro do Starlet Motel",
    "Gator Plaza Sign": "Letreiro do Gator Plaza", "Gellhorn Roadhouse Sign": "Letreiro do Gellhorn Roadhouse",
    "Juice Fruit Sign": "Letreiro da Juice Fruit", "Vice Beach Welcome Mural": "Mural de boas-vindas de Vice Beach",
    "Port Gellhorn Smokestack": "Chaminé de Port Gellhorn", "Port VC Tunnel": "Túnel do porto de VC",
    "Stockyard Walls": "Muros de Stockyard", "Lake Leonida": "Lago Leonida", "Leonida Penitentiary": "Penitenciária de Leonida",
    "National Coast Guard": "Guarda Costeira Nacional", "Grassrivers Visitor Center": "Centro de Visitantes de Grassrivers",
    "Mount Kalaga National Park": "Parque Nacional Mount Kalaga", "Vice City Casino Racetrack": "Hipódromo do Cassino de Vice City",
    "The Monument of Leonidan Supremacy": "Monumento da Supremacia Leonidana",
    # serviços públicos
    "Prison Building": "Prédio da prisão", "Cell Tower": "Torre de celular", "Police Station": "Delegacia",
    "Radio Tower": "Torre de rádio", "Radio Mast": "Mastro de rádio", "Sewage Treatment Plant": "Estação de tratamento de esgoto",
    "Air Force Radar Station": "Estação de radar da Força Aérea", "Prison": "Prisão", "Transformer Station": "Subestação",
    "Main Prison Building": "Prédio principal da prisão", "Control Tower": "Torre de controle", "Radar Tower": "Torre de radar",
    "Hangar": "Hangar", "Weather Radar": "Radar meteorológico", "Main Gate": "Portão principal",
    "Cell Tower Lot": "Terreno da torre de celular", "Public Restrooms": "Banheiros públicos", "Broadcast Tower": "Torre de transmissão",
    "Mile Zero Air Station": "Estação Aérea Mile Zero", "J.C. Anglin United States Courthouse": "Tribunal Federal J.C. Anglin",
    "Leonard County Sheriff's Office": "Xerife do Condado de Leonard",
    "Rockridge Neighborhood Service Center": "Centro de Serviços do Bairro de Rockridge",
    # lazer
    "Tennis Court": "Quadra de tênis", "Tennis court": "Quadra de tênis", "Tennis Courts": "Quadras de tênis",
    "Tennis Stadium": "Estádio de tênis", "Soccer Field": "Campo de futebol", "Football Stadium": "Estádio de futebol americano",
    "Baseball Field": "Campo de beisebol", "Piano": "Piano", "Pool": "Piscina", "Racetrack": "Autódromo", "Casino": "Cassino",
    "Outdoor Movie Screen": "Telão ao ar livre", "Giant Fish Building": "Prédio do peixe gigante", "Underwater Ruins": "Ruínas submersas",
    "Submerged Tank": "Tanque submerso", "Underwater Research Station": "Estação de pesquisa submarina",
    "Presidential Bunker": "Bunker presidencial", "Fake Tunnel Mural": "Mural de túnel falso", "Beacon": "Farol",
    "Vice Beach Outdoor Gym": "Academia ao ar livre de Vice Beach", "Aichi Condominiums Outdoor Gym": "Academia ao ar livre do Aichi Condominiums",
    "Spaceship House": "Casa da nave espacial", "Vice City Casino": "Cassino de Vice City",
    # natureza
    "Atlantic Ocean": "Oceano Atlântico", "Gulf of Leonida": "Golfo de Leonida", "Leonida Straits": "Estreito de Leonida",
    "Mariana Island": "Ilha Mariana", "Vake Island": "Ilha Vake", "Domed Hills": "Colinas Abauladas",
    # colecionáveis e pacotes
    "Collectible Card": "Carta colecionável", "Card basketball": "Carta de basquete", "Yellow Loot Box": "Caixa de saque amarela",
    "Black Loot Box": "Caixa de saque preta", "Luxury Watch": "Relógio de luxo", "Car Meet": "Encontro de carros",
    "Cocaine Flamingo": "Flamingo de cocaína", "Meteorite Fragment": "Fragmento de meteorito", "Meteorite": "Meteorito",
    "Parachute": "Paraquedas", "Safe": "Cofre", "Robbery Opportunity": "Oportunidade de assalto", "Pay 'n' Spray": "Pay 'n' Spray",
    "Half Brick of Cocaine": "Meio tijolo de cocaína", "Shipwreck": "Naufrágio", "Aviator Sunglasses": "Óculos aviador",
    "Money": "Dinheiro", "Cash and Cocaine Stash": "Esconderijo de dinheiro e cocaína", "Cocaine Crate": "Caixote de cocaína",
    "Crystal Stash": "Esconderijo de cristal", "Dead Man's Wallet": "Carteira do morto", "Gentrificator Mask": "Máscara do Gentrificador",
    "Macizo Cigars": "Charutos Macizo", "Pills Stash": "Esconderijo de comprimidos", "Purple Drank": "Purple drank",
    "Scoop Shipping container": "Contêiner da Scoop Shipping", "Shrooms Stash": "Esconderijo de cogumelos",
    "Speed Boat Cocaine": "Cocaína na lancha", "Stamped Magazine Tattoo Scan": "Revista carimbada (scan de tatuagem)",
    "Stranded Boat Cocaine": "Cocaína no barco encalhado", "Swamp Car Trunk Stash": "Esconderijo no porta-malas no pântano",
    "Tower Stash": "Esconderijo na torre", "Weed Bricks": "Tijolos de maconha", "Abandoned Train Car Stash": "Esconderijo no vagão abandonado",
    "Aqua Stadium Weed Stash": "Esconderijo de maconha do Aqua Stadium", "Lockbox": "Cofrinho",
    "Easter Egg: Beeping Bed (observatory)": "Easter egg: cama que apita (observatório)",
    "Easter Egg: Bird Nest on the Mast": "Easter egg: ninho no mastro", "Easter Egg: Evidence of a Murder": "Easter egg: provas de um assassinato",
    "Easter Egg: Giant Grab": "Easter egg: garra gigante", "Easter Egg: QR Code (NoFlushers)": "Easter egg: QR code (NoFlushers)",
    # armas genéricas
    "Sticky Bombs": "Bombas adesivas", "Molotov Cocktails": "Coquetéis molotov", "Rocket Launcher": "Lança-foguetes",
    "Sniper Rifle": "Rifle de precisão", "Frag Grenades": "Granadas de fragmentação", "Flare Gun": "Sinalizador",
    "Assassin Pistol": "Pistola do assassino", "Legendary Shotgun": "Escopeta lendária", "Gun Nut House": "Casa do fanático por armas",
    "Hobo Shotgun": "Escopeta do mendigo", "Pump Shotgun": "Escopeta de bombeamento", "Golf Clubs": "Tacos de golfe",
    "Baseball Bat": "Taco de beisebol", "Gold Revolver": "Revólver dourado", "Grenade Launcher": "Lança-granadas",
    "Machete": "Facão", "Explorer's Knife": "Faca do explorador", "Molotov Cocktails & Hammer": "Coquetéis molotov e martelo",
    "Shark Knife": "Faca de tubarão", "Soldier's Combat Knife": "Faca de combate do soldado", "Tallaloko Knife": "Faca de Tallaloko",
    "Los Santos Corkers Baseball Bat": "Taco de beisebol do Los Santos Corkers",
    # curiosidades WAiNK (descritivas)
    "Abismo Key Carcass": "Carcaça de Abismo Key", "Goose Key Carcass": "Carcaça de Goose Key", "Wetman Bay Carcass": "Carcaça de Wetman Bay",
    "Anti Sugar Residence": "Residência antiaçúcar", "Beach Party Site": "Local da festa na praia", "Big Entrance": "Grande entrada",
    "Bobcat Key Experimental Home": "Casa experimental de Bobcat Key", "Bonanza Giant": "Gigante de Bonanza",
    "Buckskin Swamp Totem": "Totem de Buckskin Swamp", "Catalan Blvd Garden": "Jardim do Catalan Blvd", "Christmas House": "Casa de Natal",
    "Dead Sharks": "Tubarões mortos", "Derelict Spy Vessel": "Navio espião abandonado", "Desert Island Piano": "Piano da ilha deserta",
    "Deserted Home": "Casa abandonada", "Dolores the Snake": "Dolores, a cobra", "Downtown Periscope": "Periscópio de Downtown",
    "Fairy Lane": "Alameda das fadas", "Fatal Incursion Plaque": "Placa da incursão fatal", "Fingerpost": "Placa de direção",
    "Fossilized Prints": "Pegadas fossilizadas", "Grassrivers Visitor Center Status": "Estátua do centro de visitantes de Grassrivers",
    "Grayson Cairns": "Montes de pedras de Grayson", "Halloween House": "Casa de Halloween", "Hovercraft Crash": "Hovercraft acidentado",
    "Howe Dairy Farm's Big Udder": "O grande úbere da Howe Dairy Farm", "Imperial Spanish Ruins": "Ruínas imperiais espanholas",
    "Intriguing Substance": "Substância intrigante", "Junkyard T-Rex": "T-Rex do ferro-velho", "Kalaga Lookout": "Mirante de Kalaga",
    "Large Lure": "Isca gigante", "Leonida Snow": "Neve de Leonida", "Lovers Lookout": "Mirante dos namorados",
    "Mermaid Display": "Vitrine da sereia", "Monument of Leonida": "Monumento de Leonida",
    "Monument of Leonidan Supremacy": "Monumento da Supremacia Leonidana", "Old Goliath": "O velho Goliath",
    "Outlaw's Cabin": "Cabana do fora da lei", "Pelican valley Observation Tower": "Torre de observação de Pelican Valley",
    "Pet Cemetery": "Cemitério de animais", "Pixel Fountain": "Fonte de pixels", "Promotional Sand Vehicles": "Veículos promocionais de areia",
    "Princess Robot Bubblegum Statue": "Estátua da Princess Robot Bubblegum", "QR Code": "QR code",
    "QR Code (Stop! Don't Flush)": "QR code (Pare! Não dê descarga)", "QR Code (The Thirsty Wolf)": "QR code (The Thirsty Wolf)",
    "Riquezas Keys Radome": "Radome de Riquezas Keys", "Sky Ride": "Teleférico", "The Grand Turkey of Capri": "O grande peru de Capri",
    "Thrillbilly Mascot": "Mascote do Thrillbilly", "Triangler Sculpture": "Escultura triangular",
    "Tucker's Citrus Farms Water Tower": "Caixa d'água da Tucker's Citrus Farms", "Unidentified Animal Pen (UAP)": "Cercado de animal não identificado (UAP)",
    "Unidentified Building": "Prédio não identificado", "Vibrant Pond": "Lago vibrante", "Vice Museum of Art Sculpture": "Escultura do Museu de Arte de Vice",
    "Wild Hog Point Radar Base": "Base de radar de Wild Hog Point", "Wreck of the Meerwunder": "Naufrágio do Meerwunder",
    "Pout Magazine": "Revista Pout", "Belville Topiary": "Topiaria de Belville",
    "Souvenir Shop": "Loja de lembrancinhas", "Gas Station Meth Front": "Fachada de metanfetamina no posto",
    "Jason's House": "Casa do Jason", "Mandy's House": "Casa da Mandy", "Shirley's House": "Casa da Shirley", "Cal's House": "Casa do Cal",
    "Small Weed Farm": "Pequena plantação de maconha", "Fishing Shacks": "Barracos de pesca", "Fake Tunnel": "Túnel falso",
    # eventos aleatórios
    "A Couple's Dream": "O sonho de um casal", "AI Ex-CEO": "Ex-CEO de IA", "ATV Rally": "Rali de quadriciclos",
    "Alien Aficionado": "Fã de alienígenas", "Alien Encounter": "Encontro alienígena", "Alien Witness": "Testemunha alienígena",
    "Anti-Theft Car": "Carro antifurto", "Assassination": "Assassinato", "Attempted Carjacking": "Tentativa de roubo de carro",
    "Bear Encounter": "Encontro com urso", "Bear Protesters (animal transport)": "Manifestantes do urso (transporte de animal)",
    "Beefslap": "Beefslap", "Being Hunted": "Sendo caçado", "Bigfoot": "Pé-Grande", "Boar Rams a Man": "Javali ataca um homem",
    "Botched Robbery": "Assalto malfeito", "Bridge Jumpers": "Saltadores da ponte", "Brofile Pic": "Foto de perfil dos manos",
    "Bud the Alien Hunter": "Bud, o caçador de alienígenas", "Burning Car Collision": "Batida com carro em chamas",
    "Caleb, the Drunk Tractor Driver": "Caleb, o tratorista bêbado", "Captive Ex-Cop": "Ex-policial em cativeiro",
    "Car Accident": "Acidente de carro", "Car Accident (truck crash)": "Acidente de carro (batida de caminhão)",
    "Car Jacking Lesson": "Aula de roubo de carro", "Caravan Fight": "Briga no trailer", "Carjacker at Gunpoint": "Ladrão de carro armado",
    "Caveman vs Panther": "Homem das cavernas contra pantera", "Cigarette Trick": "Truque do cigarro",
    "Cigarette Trick (outdoor bar)": "Truque do cigarro (bar ao ar livre)", "Clumsy Car Thief": "Ladra de carro desastrada",
    "Cocaine Yacht": "Iate da cocaína", "Cocaine Yacht Shark Attack": "Ataque de tubarão no iate da cocaína",
    "Cool Dog on a Jet Ski": "Cachorro descolado no jet ski", "Cop Interrogated by Criminals": "Policial interrogado por criminosos",
    "Corrupt Cops Rob a Dealer": "Policiais corruptos roubam um traficante", "Couch Trap": "Armadilha do sofá",
    "Creepy Neighbour Zach": "Zach, o vizinho esquisito", "Crop Dusting Job (McKittrick Farm)": "Serviço de pulverização (McKittrick Farm)",
    "Delirious Farmer": "Fazendeiro delirante", "Dirty Cops (hangar)": "Policiais corruptos (hangar)", "Disgruntled Employee": "Funcionário revoltado",
    "Dodos Rising": "A ascensão dos dodôs", "Drive-Through Rant (Pollo Diablo)": "Barraco no drive-thru (Pollo Diablo)",
    "Drug Boat Crash": "Acidente do barco de drogas", "Drug Deal": "Venda de drogas", "Drug Export Threat": "Ameaça de exportação de drogas",
    "Drugged Robber": "Ladrão drogado", "Drunk Man at the Rusty Anchor": "Bêbado no Rusty Anchor",
    "Drunk Man on a Police Car": "Bêbado em cima da viatura", "Drunk Tractor Driver": "Tratorista bêbado",
    "Drunkard Asking for Money": "Bêbado pedindo dinheiro", "Dumpster Diver": "Catador de lixo", "Dumpster Man": "Homem da caçamba",
    "Escaped Prisoners": "Presos fugitivos", "Exploding Smuggler Boat": "Barco de contrabando explodindo",
    "Farm Wife Asking for Help": "Esposa do fazendeiro pedindo ajuda", "Former Final Chapter Member Attacked": "Ex-membro da Final Chapter atacado",
    "Fortune Teller": "Cartomante", "Fox Furry Cornered by Police": "Furry de raposa encurralado pela polícia",
    "Gang Car Crash": "Acidente de carro de gangue", "Gang Revenge": "Vingança de gangue", "Gang Trade": "Troca entre gangues",
    "Garage Band": "Banda de garagem", "Gas Redneck": "Caipira da gasolina", "Gasoline Bath": "Banho de gasolina",
    "Ghost Ship (lighthouse)": "Navio fantasma (farol)", "Ghost Woman": "Mulher fantasma", "Hijack a Robbery": "Roube um assalto",
    "Hollow Earther's Camp": "Acampamento do terraplanista oco", "Hunter Shoots His Friend": "Caçador atira no amigo",
    "Iguana Target Practice": "Tiro ao alvo em iguanas", "Influencer (antenna)": "Influenciadora (antena)",
    "Influencer Falls from Overpass": "Influenciador cai do viaduto", "Influencer Livestreaming on Bridge": "Influenciador fazendo live na ponte",
    "Influencing Gone Fatal": "Influência fatal", "Insurance Fraud": "Fraude de seguro", "Insurance Fraud (van crash)": "Fraude de seguro (batida da van)",
    "Investigate the Photos": "Investigue as fotos", "Jumbo the Gator": "Jumbo, o jacaré", "Junkie Car Theft": "Roubo de carro da viciada",
    "Kidnapped Cop": "Policial sequestrado", "Kingfisher Intimidation": "Intimidação dos Kingfishers",
    "Kingfishers Ambush on the Road": "Emboscada dos Kingfishers na estrada", "Kitty Drug Bust": "Apreensão de Kitty",
    "Kitty Litter Drug Ring": "Quadrilha da Kitty Litter", "Kolt & Associates Highway Ambush": "Emboscada da Kolt & Associates na rodovia",
    "Lady with a Broken Car": "Mulher com carro quebrado", "Lady with a Couch": "Mulher com um sofá",
    "Linda's Coupon Meltdown": "O surto da Linda com o cupom", "Loose Pet Tiger": "Tigre de estimação solto",
    "Man Tied Up in a Barn": "Homem amarrado num celeiro", "Man vs Bear": "Homem contra urso",
    "Mandy Filming Her Neighbor": "Mandy filmando o vizinho", "Merman Encounter": "Encontro com o sereio",
    "Missing Person Poster": "Cartaz de desaparecido", "Missing Person: Pink Car (PRTYGRL)": "Desaparecida: carro rosa (PRTYGRL)",
    "Missing Person: Sunken Car": "Desaparecido: carro afundado", "Missing Wife": "Esposa desaparecida",
    "Mobility Scooter Robber": "Ladra da scooter de mobilidade", "Mudslider Mechanic": "Mecânico da corrida na lama",
    "Mushroom Trip (stamina boost)": "Viagem de cogumelo (mais resistência)", "Newlyweds' House": "Casa dos recém-casados",
    "Non-Flusher Movement Meeting (Frank's Waffle)": "Encontro do Non-Flusher Movement (Frank's Waffle)",
    "Non-Flusher Movement QR Code": "QR code do Non-Flusher Movement", "Overheard Conversation (chimney)": "Conversa ouvida (chaminé)",
    "Overheard Conversation (clinic)": "Conversa ouvida (clínica)", "Overpass Droppings": "Coisas jogadas do viaduto",
    "Overpass Vandals (computers)": "Vândalos do viaduto (computadores)", "Package Delivery": "Entrega de pacotes", "Paleo Bro": "Mano paleolítico",
    "Paranoid Prepper's Bunker": "Bunker do sobrevivencialista paranoico", "Payday Loan Crashout": "Surto na loja de empréstimos",
    "People Jumping in the Water": "Gente pulando na água", "Plane Crash (highway)": "Queda de avião (rodovia)",
    "Plane Crash: Cocaine and Map": "Queda de avião: cocaína e mapa", "Plane crash": "Queda de avião",
    "Polar Bear Activists": "Ativistas do urso-polar", "Polar Bear Protest (freeway)": "Protesto pelo urso-polar (rodovia)",
    "Police Raid": "Batida policial", "Redneck Shooting Party": "Festa de tiro dos caipiras",
    "Rescue the Girl from Dru Kol": "Resgate a garota de Dru Kol", "Revenge on Kolt Associates": "Vingança contra a Kolt Associates",
    "Roadside Forest Fire": "Incêndio na beira da estrada", "Robbed Naked Man": "Homem pelado assaltado", "Robbed at the ATM": "Assaltado no caixa eletrônico",
    "Sal, Shooting Victim": "Sal, vítima de tiro", "Save the Bear Protest": "Protesto \"Salve o urso\"", "Save the Cow": "Salve a vaca",
    "Shirley, the Neighbor": "Shirley, a vizinha", "Skunk Ape Effigy": "Efígie do Skunk Ape", "Smuggler Boat Explosion": "Explosão do barco de contrabando",
    "Stash Bust": "Apreensão de mercadoria", "Stolen Tiger in Van": "Tigre roubado na van", "Store Hostage Rescue": "Resgate de reféns na loja",
    "Stranded Race Driver": "Piloto de corrida na mão", "Stuntman": "Dublê", "Swamp Monster": "Monstro do pântano", "Taser Arrest": "Prisão com taser",
    "The Ghost of Rockledge Rd": "O fantasma da Rockledge Rd", "The Ritual of Sacrifice": "O ritual de sacrifício",
    "The San Fierro Tourist": "O turista de San Fierro", "Tigers in the Garages": "Tigres nas garagens", "Toilet Talk": "Conversa de banheiro",
    "Traffic Stop: Drunk Steals Cop Car": "Blitz: bêbado rouba a viatura", "Traffic Stop: Golf Clubs": "Blitz: tacos de golfe",
    "Trailer Girl (yacht)": "A garota do trailer (iate)", "Tree man": "Homem-árvore", "Truck Stuck in the Mud": "Caminhão atolado na lama",
    "Tutsi the Cow": "Tutsi, a vaca", "UFO Believer (Human Sibling)": "Crente em OVNI (Human Sibling)", "UFO Event: Suspicious Car": "Evento OVNI: carro suspeito",
    "Undercover Cop Torture": "Tortura de policial infiltrado", "VR Gamer (house)": "Gamer de realidade virtual (casa)",
    "Van Stuck in the Mud": "Van atolada na lama", "Wanted Posters (side mission)": "Cartazes de procurado (missão secundária)",
    "Warehouse Hostage": "Refém no galpão", "Wheelchair Robbery": "Assalto da cadeira de rodas", "Witch of the Swamp": "Bruxa do pântano",
    "Wounded Hunter": "Caçador ferido", "X-Files Close Encounter": "Contatos imediatos estilo Arquivo X",
    "Yard Sale (Arthur Morgan hat)": "Bazar de garagem (chapéu do Arthur Morgan)", "Yard Sale (Gary the alligator)": "Bazar de garagem (Gary, o jacaré)",
    "Zeke Pimple: Target Practice": "Zeke Pimple: tiro ao alvo",
}

PAREN = {
    "beach party": "festa na praia", "dock": "cais", "bedroom": "quarto", "abandoned house": "casa abandonada", "shipwreck": "naufrágio",
    "slum house": "casa precária", "caravan": "trailer", "gaming room": "sala de jogos", "safe": "cofre", "VR Gamer house safe": "cofre da casa do gamer",
    "billboard": "outdoor", "garage": "garagem", "island": "ilha", "armory": "arsenal", "Wyman kit car": "carro kit da Wyman",
    "radio tower": "torre de rádio", "Effluvia roof": "telhado do Effluvia", "Flash FM transmitter": "transmissor da Flash FM",
    "beached whale": "baleia encalhada", "office": "escritório", "house": "casa", "yacht": "iate", "outdoor bar": "bar ao ar livre",
    "highway": "rodovia", "under the bridge": "embaixo da ponte", "boat house": "casa de barcos", "toilet": "vaso sanitário",
    "floating box": "caixa flutuante", "gas station roof": "telhado do posto", "boarded-up shack": "barraco fechado com tábuas",
    "gold mine": "mina de ouro", "bus": "ônibus", "pool": "piscina", "observatory": "observatório", "Waink scan": "scan do WAiNK",
    "Book": "livro", "Jason's house": "casa do Jason", "lovers' camp": "acampamento dos namorados", "motel reception": "recepção do motel",
    "bar": "bar", "Lucia's make-up": "maquiagem da Lucia", "Legendary": "lendária", "Legendary Sniper Rifle": "rifle de precisão lendário",
    "Hunters event reward": "prêmio do evento dos caçadores", "Unique Variant": "variante única", "Heavy SMG": "submetralhadora pesada",
    "Marabunta Grande warehouse": "galpão da Marabunta Grande", "for sale": "à venda", "Standard": "padrão", "N": "N", "S": "S",
    "Silver": "prata", "Deep Red": "vermelho-escuro", "Bronze": "bronze", "Purple": "roxo", "Pink": "rosa", "Blue": "azul", "Red": "vermelho",
    "Gold": "ouro", "Green": "verde", "Black": "preto", "White": "branco", "Yellow": "amarelo", "Orange": "laranja",
    "purple": "roxo", "Chapter 2": "Capítulo 2", "Pollo Diablo": "Pollo Diablo", "tower": "torre",
    "WAiNK": "WAiNK", "Waink": "WAiNK",
}

AHOL = {"Wheel": "Roda", "Mattress": "Colchão", "Fridge": "Geladeira", "Tires": "Pneus", "Chair": "Cadeira", "Pallet": "Palete",
        "TV": "TV", "Cone": "Cone", "Containers": "Contêineres", "Buckets": "Baldes", "Geographies of Trash": "Geographies of Trash"}
MEDIT = {"Swamp": "no pântano", "Jason's House": "na casa do Jason", "Smooth Sand": "da areia lisa", "Worn Stone": "da pedra gasta",
         "Red Rocks": "das pedras vermelhas", "Water Wheel": "da roda d'água", "Jutting Cliff": "do penhasco saliente",
         "Waterfall": "da cachoeira", "Seaside": "à beira-mar", "Ascent": "da ascensão"}
FISH = {"Atlantic Spadefish": "Paru-branco", "Tiger Grouper": "Badejo-tigre", "Black Grouper": "Badejo-preto", "Hogfish": "Peixe-porco",
        "Largemouth Bass": "Achigã", "Stoplight Parrotfish": "Peixe-papagaio-verde", "Black Drum": "Miraguaia",
        "Sea Rock Bass": "Mero-das-pedras", "Channel Catfish": "Bagre-do-canal", "Yellowfin Tuna": "Atum-amarelo",
        "Redfin Pickerel": "Lúcio-de-barbatana-vermelha", "Cobia": "Bijupirá", "Mahi-Mahi": "Dourado-do-mar", "Common Snook": "Robalo",
        "Florida Gar": "Peixe-jacaré-da-flórida", "Salt Fish": "Peixe salgado", "Candy Fish": "Peixe-doce", "Yellowtail Snapper": "Cioba-amarela",
        "Red Northern Snapper": "Pargo-vermelho", "Green Moray Eel": "Moreia-verde", "Red Lionfish": "Peixe-leão", "Great Barracuda": "Barracuda",
        "Spanish Mackerel": "Cavala", "Littlehead Porgy": "Pargo-de-cabeça-pequena", "Redbreast Sunfish": "Peixe-sol-de-peito-vermelho",
        "Blue Striped Grunt": "Corcoroca-listrada", "Atlantic Herring": "Arenque", "Lake Chubsucker": "Chupa-lama-do-lago",
        "Striped Bass": "Robalo-listrado", "Greater Amberjack": "Olho-de-boi", "Spotted Moray Eel": "Moreia-pintada", "Permit": "Pampo",
        "American Eel": "Enguia-americana", "Bluegill": "Peixe-sol-azul", "Atlantic Tarpon": "Camurupim"}
SAFE_PREFIX = {"Office Safe": "Cofre do escritório", "Locked Safe": "Cofre trancado", "Armory Safe": "Cofre do arsenal",
               "Warehouse Safe": "Cofre do galpão", "Garage Safe": "Cofre da garagem", "RV Safe": "Cofre do trailer",
               "Dock Warehouse Safe": "Cofre do galpão do cais", "Lieutenant Room Safe": "Cofre do quarto do tenente", "Safe": "Cofre"}
GAS_BRANDS = {"Xero", "Arrow", "Alpha", "Ron", "RON", "LTD", "Globe"}
DIR = {"North": "Norte", "South": "Sul", "East": "Leste", "West": "Oeste", "South West": "Sudoeste", "North West": "Noroeste",
       "North East": "Nordeste", "South East": "Sudeste"}


def paren(s):
    def one(m):
        inner = m.group(1)
        if inner in PAREN:
            return "(" + PAREN[inner] + ")"
        return "(" + inner + ")"
    return re.sub(r"\(([^()]+)\)", one, s)


_COUNTY = re.compile(r"\b(?:(North West|North East|South West|South East|North|South|East|West) )?([A-Z][A-Za-z'-]+) County(?= *(?:$|,|\)|-|\d|No\.))")


def county(s):
    """'North Kelly County' -> 'Norte do Condado de Kelly' (só quando o condado fecha o nome)."""
    def rep(m):
        d, name = m.group(1), m.group(2)
        base = f"Condado de {name}"
        return f"{DIR[d]} do {base}" if d else base
    return _COUNTY.sub(rep, s)


# nomes de lugares no mapa (rótulos do pôster e itens de natureza): termos geográficos
WATER = [
    (r"^(.+) Ocean$", r"Oceano \1"), (r"^Gulf [Oo]f (.+)$", r"Golfo de \1"), (r"^(.+) Straits$", r"Estreito de \1"),
    (r"^(.+) Bay$", r"Baía de \1"), (r"^(.+) River$", r"Rio \1"), (r"^Lake (.+)$", r"Lago \1"), (r"^(.+) Lake$", r"Lago \1"),
    (r"^(.+) Sound$", r"Estreito de \1"), (r"^(.+) Basin$", r"Bacia de \1"), (r"^(.+) Bight$", r"Enseada de \1"),
    (r"^(.+) Reservoir$", r"Represa de \1"), (r"^(.+) National Park$", r"Parque Nacional \1"),
    (r"^(.+) State Park$", r"Parque Estadual \1"), (r"^(.+) Canyon$", r"Cânion \1"), (r"^(.+) Swamp$", r"Pântano \1"),
]
SPECIAL_LABELS = {"Atlantic Ocean": "Oceano Atlântico", "Vice City International Airport": "Aeroporto Internacional de Vice City",
                  "Henry J Edwards Airport": "Aeroporto Henry J Edwards", "Leonida State Prison": "Prisão Estadual de Leonida",
                  "Hamlet Correctional Institution": "Instituição Correcional de Hamlet", "Macallister Gold Mine": "Mina de Ouro MacAllister",
                  "MacAllister Gold Mine": "Mina de Ouro MacAllister"}


def lugar(n, cls):
    """Nome de um rótulo do mapa (classe do Google: water, ocean, park, region, hood...)."""
    if n in SPECIAL_LABELS:
        return SPECIAL_LABELS[n]
    if cls in ("water", "ocean", "park"):
        for a, b in WATER:
            if re.match(a, n):
                return re.sub(a, b, n)
    return county(n)


RULES = [
    (r"^(.+?) card: (.+)$", lambda m: f"Carta {m[1]}: {paren(m[2])}"),
    (r"^Styling Magazine: (.+)$", lambda m: f"Revista de estilo: {m[1]}"),
    (r"^Styling Magazine \((.+)\)$", lambda m: f"Revista de estilo ({PAREN.get(m[1], m[1])})"),
    (r"^Tattoo Magazine: (.+)$", lambda m: f"Revista de tatuagem: {m[1]}"),
    (r"^Tattoo Magazine \((.+)\)$", lambda m: f"Revista de tatuagem ({PAREN.get(m[1], m[1])})"),
    (r"^Book: (.+)$", lambda m: f"Livro: {paren(m[1])}"),
    (r"^Magazine rack: (.+)$", lambda m: f"Expositor de revistas: {m[1]}"),
    (r"^Mermaid Tattoo Book$", lambda m: "Livro de tatuagens de sereia"),
    (r"^Waink Tattoo Style \((.+)\)$", lambda m: f"Estilo de tatuagem WAiNK ({PAREN.get(m[1], m[1])})"),
    (r"^(.+?) [Cc]ard$", lambda m: f"Carta {m[1]}"),
    (r"^Under the Bridge: (.+)$", lambda m: f"Sob a ponte: {m[1]}"),
    (r"^Hoop (\d+) - (.+)$", lambda m: f"Cesta {m[1]} - {county(m[2])}"),
    (r"^Stun?st Jump (.+)$", lambda m: f"Salto acrobático {m[1]}"),
    (r"^(.+?) Stunt [Jj]ump$", lambda m: f"Salto acrobático {m[1]}"),
    (r"^Knife Flight: (.+)$", lambda m: f"Voo rasante: {m[1]}"),
    (r"^(.+?) Knife Flights?$", lambda m: f"Voo rasante {m[1]}"),
    (r"^(.+?) Base Jump$", lambda m: f"BASE jump {m[1]}"),
    (r"^Parachute \((.+)\)$", lambda m: f"Paraquedas ({PAREN.get(m[1], m[1])})"),
    (r"^Hotspot - (.+)$", lambda m: f"Ponto de pesca - {FISH.get(m[1], m[1])}"),
    (r"^(.+?) Hunting Spot$", lambda m: f"Ponto de caça - {m[1]}"),
    (r"^(.+?) Meditation$", lambda m: f"Meditação {MEDIT.get(m[1], m[1])}"),
    (r"^(Office|Locked|Armory|Warehouse|Garage|RV|Dock Warehouse|Lieutenant Room) Safe( \d+)? - (.+)$",
     lambda m: f"{SAFE_PREFIX[m[1] + ' Safe']}{m[2] or ''} - {m[3]}"),
    (r"^Safe ?- ?(.+)$", lambda m: f"Cofre - {paren(m[1])}"),
    (r"^Safe \((.+)\)$", lambda m: f"Cofre ({PAREN.get(m[1], m[1].replace('code', 'código'))})"),
    (r"^Robbery Opportunity - (.+)$", lambda m: f"Oportunidade de assalto - {m[1]}"),
    (r"^Criminals: (.+)$", lambda m: f"Criminosos: {m[1]}"),
    (r"^Opponent Pool - (.+)$", lambda m: f"Sinuca com adversário - {m[1]}"),
    (r"^Pool - (.+)$", lambda m: f"Sinuca - {m[1]}"),
    (r"^Ahol Street Art: (.+?)( \d+)?$", lambda m: f"Arte de rua Ahol: {AHOL.get(m[1], m[1])}{m[2] or ''}"),
    (r"^Ahol Street Art$", lambda m: "Arte de rua Ahol"),
    (r"^(\d+) Mural: (.+)$", lambda m: f"Mural {m[1]}: {m[2]}"),
    (r"^Book Swap (\d+)$", lambda m: f"Troca de livros {m[1]}"),
    (r"^Message in a Bottle (\d+)$", lambda m: f"Mensagem na garrafa {m[1]}"),
    (r"^(.+?) Treasure( .+)?$", lambda m: f"Tesouro {m[1]}{m[2] or ''}"),
    (r"^Payday Loans Store - (.+)$", lambda m: f"Loja de empréstimos - {m[1]}"),
    (r"^(.+?) Helipad( \(\d+\))?$", lambda m: f"Heliponto - {county(m[1])}{m[2] or ''}"),
    (r"^Luxury Watch: (.+)$", lambda m: f"Relógio de luxo: {m[1]}"),
    (r"^Luxury Watch \((.+)\)$", lambda m: f"Relógio de luxo ({PAREN.get(m[1], m[1])})"),
    (r"^SCOOP Container \((.+)\)$", lambda m: f"Contêiner SCOOP ({PAREN.get(m[1], m[1])})"),
    (r"^SCOOP Container$", lambda m: "Contêiner SCOOP"),
    (r"^Meteorite Fragments? \((.+)\)$", lambda m: f"Fragmento de meteorito ({PAREN.get(m[1], m[1])})"),
    (r"^Meteorite \((.+)\)$", lambda m: f"Meteorito ({PAREN.get(m[1], m[1])})"),
    (r"^Cocaine Flamingos? \((.+)\)$", lambda m: f"Flamingo de cocaína ({PAREN.get(m[1], m[1])})"),
    (r"^Turn (\d+[A-Z]?)$", lambda m: f"Curva {m[1]}"),
    (r"^(.+), Room (\d+)$", lambda m: f"{m[1]}, quarto {m[2]}"),
    (r"^Container Crane (\(?\d+\)?)$", lambda m: f"Guindaste de contêineres {m[1]}"),
    (r"^Prison Tower \((\d+)\)$", lambda m: f"Torre da prisão ({m[1]})"),
    (r"^Skunk Apeology (\d+)$", lambda m: f"Skunk Apeologia {m[1]}"),
    (r"^Mistaken Identity \((.+)\)$", lambda m: f"Identidade trocada ({m[1]})"),
    (r"^(?:Bags of Acid|Shrooms Stash|Cash Box|Money Box|Jewellery Lockbox|Two Bags of Cocaine|Lockbox) .*$", None),
    (r"^(.+?) (Train Station|Metro Station|Metromover Station)( \((?:North|South)\))?$",
     lambda m: {"Train Station": "Estação de trem", "Metro Station": "Estação de metrô", "Metromover Station": "Estação do Metromover"}[m[2]]
     + f" {m[1]}" + ({" (North)": " (norte)", " (South)": " (sul)"}.get(m[3] or "", ""))),
    (r"^(.+?) Airfield$", lambda m: f"Aeródromo {county(m[1])}"),
    (r"^(.+?) Airport$", lambda m: f"Aeroporto {m[1]}"),
    (r"^(.+?) (Police Station|Police Department|Police Dept)$", lambda m: f"Delegacia de {m[1]}"),
    (r"^(.+?) (Fire Station|Fire Department|Fire Dept|Fire Rescue Station|Fire Rescue Dept)( No\.)?( \d+)?$",
     lambda m: f"Bombeiros de {county(m[1])}{m[4] or ''}"),
    (r"^(.+?) Hospital$", lambda m: f"Hospital de {m[1]}"),
    (r"^(.+?) Medical Center$", lambda m: f"Centro Médico de {m[1]}"),
    (r"^(.+?) Water Tower$", lambda m: f"Caixa d'água de {m[1]}"),
    (r"^(.+?) Gas Station( \(.+\))?$",
     lambda m: (f"Posto {m[1]}" if m[1].split()[0] in GAS_BRANDS else f"Posto de gasolina de {county(m[1])}") + paren(m[2] or "")),
]


def _composite(n):
    """Pacotes com valor: 'Bags of Acid ($300-$450)' etc."""
    base = {"Bags of Acid": "Sacos de ácido", "Shrooms Stash": "Esconderijo de cogumelos", "Cash Box": "Caixa de dinheiro",
            "Money Box": "Caixa de dinheiro", "Jewellery Lockbox": "Cofrinho de joias", "Two Bags of Cocaine": "Dois sacos de cocaína",
            "Three Bags of Cocaine": "Três sacos de cocaína", "Lockbox": "Cofrinho", "Bag of Cocaine": "Saco de cocaína",
            "LSD Stash": "Esconderijo de LSD", "Pills Stash": "Esconderijo de comprimidos", "Weed Stash": "Esconderijo de maconha",
            "Cannabis Stash": "Esconderijo de maconha", "Crystal Stash": "Esconderijo de cristal",
            "Small Bag of Drugs": "Saquinho de drogas", "Hobo Shotgun": "Escopeta do mendigo", "Shotgun": "Escopeta"}
    for k, v in base.items():
        if n.startswith(k + " ") or n == k:
            rest = n[len(k):]
            rest = rest.replace(" - Boat House", " - casa de barcos")
            return v + paren(rest)
    return None


def nome(n):
    if n in NOMES:
        return NOMES[n]
    c = _composite(n)
    if c:
        return c
    if re.match(r"^\$\d+ cash in box south side of this building$", n):
        return n.replace(" cash in box south side of this building", " em dinheiro numa caixa no lado sul deste prédio")
    for pat, fn in RULES:
        m = re.match(pat, n)
        if m and fn:
            return fn(m)
    return county(paren(n))


# ------------------------------------------------------------------ descrições
NIVEL = {"Very low": "muito baixo", "Low": "baixo", "Medium": "médio", "High": "alto", "Very high": "muito alto"}
NIVEL_F = {"Very low": "muito baixa", "Low": "baixa", "Medium": "média", "High": "alta", "Very high": "muito alta"}
ESTILO = {"Casual": "casual", "Streetwear": "streetwear", "Sportswear": "esportivo", "Formal": "formal", "Souvenir": "lembrancinhas",
          "Swimwear": "moda praia", "Thrift": "brechó", "Unisex": "unissex", "Beauty Salon": "salão de beleza", "Barber": "barbearia",
          "American Traditional": "tradicional americano", "Black & Gray": "preto e cinza", "Anime": "anime", "Illustrative": "ilustrativo",
          "New School": "new school", "Old School": "old school", "Neo-Traditional": "neotradicional",
          "Geometric & Blackwork": "geométrico e blackwork", "Lettering": "lettering", "Stick & Poke": "stick and poke"}
ESPEC = {"Racing": "corrida", "Luxury": "luxo", "Sports Bikes": "motos esportivas", "Dirt Bikes": "motos de trilha",
         "Vinyl": "envelopamento", "Off-Road": "off-road"}
ESTOQUE = {"Standard": "padrão", "Expanded": "ampliado", "Limited": "limitado", "Hunting": "caça"}
META = [
    (r"^Security: (.+)$", lambda m: f"Segurança: {NIVEL_F.get(m[1], m[1])}"),
    (r"^Take value: (.+)$", lambda m: f"Valor do roubo: {m[1]}"),
    (r"^Price: (.+)$", lambda m: f"Preço: {m[1]}"),
    (r"^Parking spots: (\d+)$", lambda m: f"Vagas: {m[1]}"),
    (r"^Gang: (.+)$", lambda m: f"Gangue: {m[1]}"),
    (r"^Style: (.+)$", lambda m: f"Estilo: {ESTILO.get(m[1], m[1])}"),
    (r"^Specialty: (.+)$", lambda m: f"Especialidade: {ESPEC.get(m[1], m[1])}"),
    (r"^Inventory: (.+)$", lambda m: f"Estoque: {ESTOQUE.get(m[1], m[1])}"),
    (r"^Robbery: Teller$", lambda m: "Assalto: caixa"),
    (r"^Robbery: Vault$", lambda m: "Assalto: cofre-forte"),
    (r"^Unlocked: Chapter (\d+)$", lambda m: f"Liberado: Capítulo {m[1]}"),
    (r"^Unlocked: Final chapter$", lambda m: "Liberado: capítulo final"),
    (r"^Narcotics: (.+)$", lambda m: f"Drogas: {NIVEL.get(m[1], m[1])}"),
    (r"^Jewelry: (.+)$", lambda m: f"Joias: {NIVEL.get(m[1], m[1])}"),
    (r"^Marked bills: (.+)$", lambda m: f"Notas marcadas: {NIVEL.get(m[1], m[1])}"),
    (r"^Teller robbery$", lambda m: "Assalto ao caixa"),
    (r"^Part of the Ultimate Edition\.?$", lambda m: "Faz parte da Ultimate Edition"),
    (r"^Ultimate Edition content$", lambda m: "Conteúdo da Ultimate Edition"),
]


def _seg(s):
    s = s.strip()
    if s in SEGMENTOS:
        return SEGMENTOS[s]
    if s in COMPLETO:
        return COMPLETO[s]
    for pat, fn in META:
        m = re.match(pat, s)
        if m:
            return fn(m)
    return None


def descricao(d):
    """Devolve (texto, traduzido?)."""
    if d in COMPLETO:
        return COMPLETO[d], True
    parts = d.split("; ")
    out, ok = [], True
    for p in parts:
        t = _seg(p)
        if t is None:
            ok = False
            t = p
        out.append(t)
    return "; ".join(out), ok


def tipo(t):
    if t in TIPOS:
        return TIPOS[t]
    m = re.match(r"^(.+?) card$", t)
    if m:
        return f"Carta {m[1]}"
    return t


def area(a):
    return county(a)
