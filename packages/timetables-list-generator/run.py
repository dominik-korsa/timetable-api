import asyncio

from generator import TimetablesListGenerator

generator = TimetablesListGenerator()
asyncio.run(generator.generate_list_from_rspo_api_data())
