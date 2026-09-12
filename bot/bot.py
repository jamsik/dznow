"""Бот-приглашение для DZNOW.

Делает ровно две вещи: показывает кнопку, которая открывает Mini App, и
прописывает эту же кнопку в меню чата, чтобы её не пришлось настраивать
руками в BotFather.

Авторизации здесь нет и не должно быть: когда Telegram открывает Mini App,
он передаёт в неё подписанный initData, а подпись проверяет API
(api/app/auth.py) по тому же BOT_TOKEN. Бот в этой цепочке — только дверь.

Длинный опрос, а не вебхук: вебхук потребовал бы отдельного маршрута в
прокси и публичного адреса именно для бота. Для теста это лишнее, а опрос
работает даже за NAT.
"""
import asyncio
import logging
import os

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.filters import CommandStart
from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    MenuButtonWebApp,
    Message,
    WebAppInfo,
)

TOKEN = os.environ.get("BOT_TOKEN", "").strip()
APP_URL = os.environ.get("APP_URL", "").strip().rstrip("/")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("dznow-bot")

dp = Dispatcher()


def keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="Открыть DZNOW", web_app=WebAppInfo(url=APP_URL))
    ]])


@dp.message(CommandStart())
async def start(message: Message) -> None:
    await message.answer(
        "DZNOW — данные превращаются в готовый макет для сторис.\n"
        "Введите цифры по объекту и получите картинку 1080×1920 "
        "в стиле вашего агентства.",
        reply_markup=keyboard(),
    )


@dp.message()
async def anything(message: Message) -> None:
    # Бот ничего не обсуждает: всё происходит внутри приложения.
    await message.answer("Всё внутри приложения:", reply_markup=keyboard())


async def main() -> None:
    if not TOKEN:
        raise SystemExit("Не задан BOT_TOKEN — возьмите токен у @BotFather и положите в .env")
    if not APP_URL.startswith("https://"):
        # Telegram открывает Mini App только по https и молча ничего не делает
        # по http. Лучше не подняться с понятным текстом, чем показывать
        # кнопку, которая не работает.
        raise SystemExit(f"APP_URL должен начинаться с https:// — сейчас {APP_URL!r}")

    bot = Bot(TOKEN, default=DefaultBotProperties(parse_mode=None))
    me = await bot.get_me()

    # Кнопка меню рядом со строкой ввода — настраивается отсюда,
    # в BotFather лезть не нужно.
    await bot.set_chat_menu_button(
        menu_button=MenuButtonWebApp(text="DZNOW", web_app=WebAppInfo(url=APP_URL))
    )

    log.info("бот @%s запущен, приложение: %s", me.username, APP_URL)
    await dp.start_polling(bot, allowed_updates=["message"])


if __name__ == "__main__":
    asyncio.run(main())
