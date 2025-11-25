# Optimized Fyers DataFeed -------->Kodebuds

from fyers_apiv3 import fyersModel
from fyers_apiv3.FyersWebsocket import data_ws
from .auth import FyersAuth
from .processor import process_hist_data, process_live_data
import datetime
import time
import polars as pl

class FyersDataFeed:
    """Optimized Fyers data feed handler."""
    
    def __init__(self, force_refresh_auth=False):
        # Always get fresh credentials to pick up any new tokens
        self.client_id, self.access_token = FyersAuth.get_fyers_credentials()
        self._hist_model = None

    @property
    def hist_model(self):
        """Lazy initialization of historical data model with fresh token."""
        if self._hist_model is None or not self.access_token:
            # Get fresh credentials in case token was updated
            self.client_id, self.access_token = FyersAuth.get_fyers_credentials()
            self._hist_model = fyersModel.FyersModel(
                client_id=self.client_id, 
                is_async=False, 
                token=self.access_token, 
                log_path=""
            )
        return self._hist_model

    def get_historical_data(self, symbol, resolution=None, start_date=None, end_date=None, 
                          date_format=None, timeframe='5min', process=True, time_now=True, 
                          days_back=29, data_frame=False, bucket_size=0.05, multiplier=100, footprint=True):
        """
        Optimized historical data fetcher with default 29-day lookback.
        
        Args:
            symbol: String or list of symbols
            timeframe: Target timeframe ('1m', '5m', '15m', '1d')
            process: Whether to process raw data
            time_now: Use last 29 days with 5S resolution
            days_back: Number of days to look back if time_now is True
            Other args: Processing parameters
        
        Returns:
            Processed data for symbol(s)
        """
        if time_now:
            now = datetime.datetime.now()
            
            # Standard 29-day lookback ending at 'now'
            end_date = int(time.mktime(now.timetuple()))
            start_date = int(time.mktime((now - datetime.timedelta(days=days_back)).timetuple()))

            date_format = '0'
            used_resolution = '5S'
        else:
            if not resolution:
                raise ValueError("resolution must be provided if time_now is False")
            used_resolution = resolution

        def fetch_and_process(sym):
            """Fetch and process data for a single symbol."""
            data = {
                "symbol": sym,
                "resolution": used_resolution,
                "date_format": str(date_format),
                "range_from": str(start_date),
                "range_to": str(end_date),
                "cont_flag": "1"
            }
            
            raw = self.hist_model.history(data)
            candles = raw.get('candles', [])
            
            # Create DataFrame efficiently
            df = pl.DataFrame(
                candles, 
                schema=["timestamp", "open", "high", "low", "close", "volume"], 
                orient="row"
            )
            
            if process:
                return process_hist_data(
                    df=df, timeframe=timeframe, data_frame=data_frame, 
                    bucket_size=bucket_size, multiplier=multiplier, footprint=footprint
                )
            return df

        # Handle single symbol or list of symbols
        if isinstance(symbol, list):
            return {sym: fetch_and_process(sym) for sym in symbol}
        else:
            return fetch_and_process(symbol)
        
    def get_live_update(self, symbol, timeframe='5m', bucket_size=0.05, multiplier=100):
        """Subscribe to live data updates."""
        data_type = "SymbolUpdate"

        def onmessage(message):
            processed = process_live_data(
                message, timeframe=timeframe, bucket_size=bucket_size, multiplier=multiplier
            )
            print(processed)

        def onerror(message):
            print("Error:", message)

        def onclose(message):
            print("Connection closed:", message)

        def onopen():
            live_data.subscribe(symbols=[symbol], data_type=data_type)
            live_data.keep_running()

        live_data = data_ws.FyersDataSocket(
            access_token=self.access_token,
            log_path="",
            litemode=False,
            write_to_file=False,
            reconnect=True,
            on_connect=onopen,
            on_close=onclose,
            on_error=onerror,
            on_message=onmessage,            
        )
        live_data.connect()
        
        # Return the live_data object so caller can use close_connection()
        return live_data

if __name__ == "__main__":
    # Example usage
    fyers_df = FyersDataFeed()
    symbols = ["NSE:SBIN-EQ"]    
    historical_data = fyers_df.get_historical_data(symbol=symbols)
    print("Historical Data:")
    for sym, data in historical_data.items():
        print(f"{sym}: {data}\n")